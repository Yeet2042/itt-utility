from typhoon_ocr import ocr_document
import os

os.environ["TYPHOON_OCR_API_KEY"] = "👀"

markdown = ocr_document(
    pdf_or_image_path="💀",
    task_type="default",
)
print(markdown)