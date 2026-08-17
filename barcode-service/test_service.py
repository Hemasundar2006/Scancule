import os
import sys

# Add current directory to path to allow importing main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import make_qr_image, make_barcode_image, make_pdf_label_sheet, ProductLabelData

def run_tests():
    print("Starting verification of barcode and QR generation logic...")
    
    # Create test_output directory
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_output")
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Test QR generation
    print("Testing QR generation...")
    qr_data = "https://example.com/p/TEST1234"
    qr_stream = make_qr_image(qr_data, logo_url=None)
    qr_file_path = os.path.join(output_dir, "test_qr.png")
    with open(qr_file_path, "wb") as f:
        f.write(qr_stream.read())
    print(f"QR code image saved successfully to: {qr_file_path}")
    
    # 2. Test Barcode generation
    print("Testing 1D barcode generation...")
    barcode_data = "CODE128TEST"
    barcode_stream = make_barcode_image(barcode_data)
    barcode_file_path = os.path.join(output_dir, "test_barcode.png")
    with open(barcode_file_path, "wb") as f:
        f.write(barcode_stream.read())
    print(f"1D barcode image saved successfully to: {barcode_file_path}")
    
    # 3. Test Bulk PDF generation
    print("Testing PDF label sheet generation...")
    mock_products = [
        ProductLabelData(unique_code="PROD001", name="Premium Wireless Headphones", price="4999"),
        ProductLabelData(unique_code="PROD002", name="Mechanical Keyboard RGB", price="2499"),
        ProductLabelData(unique_code="PROD003", name="Ergonomic Mouse", price="1299"),
        ProductLabelData(unique_code="PROD004", name="USB-C Hub Multiport", price="1899"),
        ProductLabelData(unique_code="PROD005", name="4K Ultra-Wide Monitor", price="28999"),
    ]
    pdf_stream = make_pdf_label_sheet(mock_products)
    pdf_file_path = os.path.join(output_dir, "test_labels.pdf")
    with open(pdf_file_path, "wb") as f:
        f.write(pdf_stream.read())
    print(f"Printable PDF label sheet saved successfully to: {pdf_file_path}")
    
    print("\nAll barcode service engine checks completed successfully!")

if __name__ == "__main__":
    run_tests()
