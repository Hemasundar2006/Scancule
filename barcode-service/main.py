import io
import os
import requests
from typing import List, Optional
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image
import qrcode
import barcode
from barcode.writer import ImageWriter
import gspread

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader

# Initialize FastAPI
app = FastAPI(title="Barcode and QR Generation Microservice")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Retrieve security token and public URL configuration from env
INTERNAL_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "super-secret-default-token")
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "http://localhost:5173")

# Dependency to check authorization token
def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Authorization scheme must be Bearer")
        if token != INTERNAL_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid API Token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

# Request Models
class QrRequest(BaseModel):
    unique_code: str
    shop_logo_url: Optional[str] = None

class BarcodeRequest(BaseModel):
    unique_code: str

class ProductLabelData(BaseModel):
    unique_code: str
    name: str
    price: Optional[str] = None

class BulkPdfRequest(BaseModel):
    products: List[ProductLabelData]

class SyncScanRequest(BaseModel):
    sheet_id: str
    row: List[str]

class SyncAllRequest(BaseModel):
    sheet_id: str
    rows: List[List[str]]

# Helper: Connect to Google Sheets via Service Account
def get_gspread_client():
    creds_path = os.path.join(os.path.dirname(__file__), "credentials.json")
    if not os.path.exists(creds_path):
        raise HTTPException(status_code=500, detail="credentials.json not found in backend directory")
    try:
        return gspread.service_account(filename=creds_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to authenticate with Service Account: {str(e)}")

# Helper: Generate QR with optional Logo overlay
def make_qr_image(data: str, logo_url: Optional[str] = None) -> io.BytesIO:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High correction to tolerate overlay
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white").convert('RGBA')
    
    if logo_url:
        try:
            response = requests.get(logo_url, timeout=5)
            if response.status_code == 200:
                logo = Image.open(io.BytesIO(response.content)).convert('RGBA')
                img_w, img_h = img.size
                logo_size = int(img_w * 0.22)  # Logo occupies 22% of QR space
                logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                
                pos_w = (img_w - logo_size) // 2
                pos_h = (img_h - logo_size) // 2
                img.paste(logo, (pos_w, pos_h), mask=logo)
        except Exception as e:
            # If logo download fails, we fall back to standard QR code
            print(f"Failed to overlay logo: {e}")
            
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr

# Helper: Generate Code128 barcode image
def make_barcode_image(data: str) -> io.BytesIO:
    COD128 = barcode.get_class('code128')
    barcode_instance = COD128(data, writer=ImageWriter())
    
    rv = io.BytesIO()
    # Explicitly write code to stream. Options can adjust text distance, size, etc.
    barcode_instance.write(rv, options={"module_height": 10.0, "font_size": 8, "text_distance": 3.0})
    rv.seek(0)
    return rv

# Helper: Generate printable PDF grid sheet (3 cols x 7 rows = 21 labels per A4 page)
def make_pdf_label_sheet(products: List[ProductLabelData]) -> io.BytesIO:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    width, height = A4
    cols = 3
    rows = 7
    
    # Margin settings
    margin_x = 8 * mm
    margin_y = 12 * mm
    spacing_x = 4 * mm
    spacing_y = 4 * mm
    
    label_width = (width - (2 * margin_x) - ((cols - 1) * spacing_x)) / cols
    label_height = (height - (2 * margin_y) - ((rows - 1) * spacing_y)) / rows
    
    x_positions = [margin_x + i * (label_width + spacing_x) for i in range(cols)]
    y_positions = [height - margin_y - (i + 1) * label_height - i * spacing_y for i in range(rows)]
    
    product_idx = 0
    num_products = len(products)
    
    while product_idx < num_products:
        for r in range(rows):
            for col in range(cols):
                if product_idx >= num_products:
                    break
                
                prod = products[product_idx]
                x = x_positions[col]
                y = y_positions[r]
                
                # Draw rounded rectangle border
                c.setStrokeColorRGB(0.7, 0.7, 0.7)
                c.setLineWidth(0.5)
                c.roundRect(x, y, label_width, label_height, 2 * mm)
                
                # Header: Product Name and Price
                c.setFillColorRGB(0.1, 0.1, 0.1)
                c.setFont("Helvetica-Bold", 8.5)
                name_text = prod.name
                if len(name_text) > 20:
                    name_text = name_text[:17] + "..."
                c.drawString(x + 3 * mm, y + label_height - 4.5 * mm, name_text)
                
                if prod.price:
                    c.setFont("Helvetica-Bold", 8.5)
                    c.setFillColorRGB(0.85, 0.35, 0.1) # orange accent
                    price_text = f"Rs. {prod.price}"
                    c.drawRightString(x + label_width - 3 * mm, y + label_height - 4.5 * mm, price_text)
                
                # Draw 1D Barcode with numbers underneath
                try:
                    bc_stream = make_barcode_image(prod.unique_code)
                    bc_reader = ImageReader(bc_stream)
                    bc_w = label_width - 6 * mm
                    bc_h = label_height - 6.5 * mm
                    c.drawImage(bc_reader, x + 3 * mm, y + 1.5 * mm, width=bc_w, height=bc_h, preserveAspectRatio=True, anchor='c')
                except Exception as e:
                    print(f"Error drawing barcode on label: {e}")
                    c.setFont("Helvetica", 8)
                    c.setFillColorRGB(0.8, 0.2, 0.2)
                    c.drawCentredString(x + label_width / 2, y + label_height / 2, prod.unique_code)
                
                c.setFillColorRGB(0, 0, 0) # reset
                product_idx += 1
                
        if product_idx < num_products:
            c.showPage()
            
    c.save()
    buffer.seek(0)
    return buffer

# ENDPOINTS

@app.post("/generate-qr", dependencies=[Depends(verify_token)])
def generate_qr(req: QrRequest):
    product_url = f"{PUBLIC_APP_URL}/p/{req.unique_code}"
    qr_stream = make_qr_image(product_url, req.shop_logo_url)
    return StreamingResponse(qr_stream, media_type="image/png")

@app.post("/generate-barcode", dependencies=[Depends(verify_token)])
def generate_barcode(req: BarcodeRequest):
    # Ensure code is safe for code128 representation (alphanumeric check recommended)
    if not req.unique_code.isalnum():
        # Clean unique code logic to replace non-alphanumeric chars or raise warning
        pass
    try:
        barcode_stream = make_barcode_image(req.unique_code)
        return StreamingResponse(barcode_stream, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate 1D barcode: {str(e)}")

@app.post("/generate-bulk-pdf", dependencies=[Depends(verify_token)])
def generate_bulk_pdf(req: BulkPdfRequest):
    if not req.products:
        raise HTTPException(status_code=400, detail="Product list cannot be empty")
    pdf_stream = make_pdf_label_sheet(req.products)
    return StreamingResponse(pdf_stream, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=labels.pdf"
    })

@app.post("/sync-scan", dependencies=[Depends(verify_token)])
def sync_scan(req: SyncScanRequest):
    try:
        gc = get_gspread_client()
        sheet = gc.open_by_key(req.sheet_id).sheet1
        sheet.append_row(req.row)
        return {"status": "success", "message": "Row appended"}
    except gspread.exceptions.APIError as e:
        if e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="Permission denied. Did you share the sheet with the Service Account email?")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync-all", dependencies=[Depends(verify_token)])
def sync_all(req: SyncAllRequest):
    try:
        gc = get_gspread_client()
        sheet = gc.open_by_key(req.sheet_id).sheet1
        if not req.rows:
            return {"status": "success", "message": "No rows to append"}
        sheet.append_rows(req.rows)
        return {"status": "success", "message": f"{len(req.rows)} rows appended"}
    except gspread.exceptions.APIError as e:
        if e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="Permission denied. Did you share the sheet with the Service Account email?")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health Check Endpoint
@app.get("/health")
def health():
    return {"status": "ok"}
