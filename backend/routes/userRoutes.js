const express = require('express');
const router = express.Router();
const { upload, cloudinary } = require('../config/cloudinary');
const { authenticateJWT } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Upload profile picture
router.post('/upload-profile-picture', authenticateJWT, upload.single('profile_picture'), async (req, res) => {
    try {
        console.log('Received profile picture upload request');
        
        if (!req.file) {
            console.error('No file received in the request');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Get the full Cloudinary URL
        const cloudinaryUrl = cloudinary.url(req.file.filename, {
            secure: true,
            transformation: [{ width: 500, height: 500, crop: 'fill' }]
        });

        console.log('File uploaded successfully to Cloudinary:', cloudinaryUrl);

        // Update the user's profile picture in the database with the full URL
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { profile_picture: cloudinaryUrl },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the complete Cloudinary URL
        res.json({
            success: true,
            profile_picture: cloudinaryUrl
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        
        // Check if it's a Cloudinary error
        if (error.http_code) {
            return res.status(error.http_code).json({
                message: `Cloudinary error: ${error.message}`
            });
        }

        res.status(500).json({ 
            message: 'Error uploading profile picture',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 