const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Single call
router.post('/single-call', callController.singleCall);
// Bulk upload
router.post('/upload-excel', upload.single('file'), callController.uploadExcel);

module.exports = router;
