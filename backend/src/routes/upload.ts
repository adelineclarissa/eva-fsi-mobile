import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { addDocument, getDocumentList } from '../services/rag';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'));
    }
  },
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const content = pdfData.text;

    if (!content.trim()) {
      return res.status(400).json({ error: 'PDF appears to be empty or unreadable' });
    }

    const docId = await addDocument(req.file.originalname, content);

    return res.json({
      success: true,
      documentId: docId,
      name: req.file.originalname,
      pages: pdfData.numpages,
      wordCount: content.split(/\s+/).length,
      message: `Document "${req.file.originalname}" uploaded and indexed successfully`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/documents', (_req: Request, res: Response) => {
  return res.json({ documents: getDocumentList() });
});

export default router;
