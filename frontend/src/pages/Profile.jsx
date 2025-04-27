import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { getProfile, updateProfile, changePassword, uploadProfilePicture } from '../api/api';
import ImageCropper from '../components/ImageCropper';
import './Profile.css';

const Profile = () => {
    const { user, setUser, logout } = useContext(UserContext);
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone_number: '',
        profile_picture: ''
    });
    const [editMode, setEditMode] = useState(false);
    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false); // State for password section collapse
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!user) {
                    navigate('/login');
                    return;
                }
                const data = await getProfile();
                setProfileData(data);
            } catch (err) {
                if (err.isAuthError) {
                    logout();
                    navigate('/login');
                    return;
                }
                setError('Failed to load profile information.');
                console.error("Error fetching profile:", err);
            }
        };
        fetchProfile();
    }, [user, navigate, logout]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordFields(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleEditClick = () => {
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        const fetchProfileAgain = async () => {
            try {
                const data = await getProfile();
                setProfileData(data);
            } catch (err) {
                setError('Failed to reload profile information.');
                console.error("Error refetching profile:", err);
            }
        };
        fetchProfileAgain();
        setMessage('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const updatedData = await updateProfile(profileData);
            setUser(updatedData);
            setProfileData(updatedData);
            setEditMode(false);
            setMessage('Profile updated successfully!');
        } catch (err) {
            setError(err.message || 'Failed to update profile.');
            console.error("Error updating profile:", err);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (passwordFields.newPassword !== passwordFields.confirmNewPassword) {
            setError("New password and confirm password do not match.");
            return;
        }
        try {
            await changePassword(passwordFields);
            setMessage('Password changed successfully!');
            setPasswordFields({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
            setIsPasswordSectionOpen(false); // Close password section after successful change
        } catch (err) {
            setError(err.message || 'Failed to change password.');
            console.error("Error changing password:", err);
        }
    };

    const togglePasswordSection = () => {
        setIsPasswordSectionOpen(!isPasswordSectionOpen);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size should be less than 5MB');
                return;
            }
            if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
                setError('Please upload a valid image file (JPEG, PNG)');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImage(e.target.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedImageBlob) => {
        try {
            // Convert the blob to a File object
            const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' });
            
            // Upload the file using the new API function
            const data = await uploadProfilePicture(file);
            
            // Update the profile data with the new image URL
            setProfileData(prev => ({ ...prev, profile_picture: data.profile_picture }));
            setUser(prev => ({ ...prev, profile_picture: data.profile_picture }));
            setShowCropper(false);
            setSelectedImage(null);
            setMessage('Profile picture updated successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload profile picture');
            console.error('Error uploading profile picture:', err);
        }
    };

    const handleCancelCrop = () => {
        setShowCropper(false);
        setSelectedImage(null);
    };

    return (
        <div className="profile-container">
            {showCropper && (
                <ImageCropper
                    image={selectedImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCancelCrop}
                />
            )}
            
            <div className="profile-header">
                <h1>My Account</h1>
            </div>

            {error && <div className="profile-alert error">{error}</div>}
            {message && <div className="profile-alert success">{message}</div>}

            <div className="profile-section">
                <div className="section-header">
                    <h2>{editMode ? 'Edit Account' : 'Account Details'}</h2>
                    {!editMode && (
                        <button className="btn-edit" onClick={handleEditClick}>
                            Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group">
                        <label>Profile Picture</label>
                        <div className="profile-picture-container">
                            {profileData.profile_picture ? (
                                <img 
                                    src={profileData.profile_picture} 
                                    alt="Profile" 
                                    className="profile-picture-preview"
                                />
                            ) : (
                                <div className="profile-picture-placeholder">
                                    No profile picture
                                </div>
                            )}
                            {editMode && (
                                <div className="profile-picture-upload">
                                    <input
                                        type="file"
                                        id="profile-picture-input"
                                        accept="image/jpeg,image/png"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="profile-picture-input" className="btn-upload">
                                        Upload New Picture
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Full Name</label>
                        {editMode ? (
                            <input type="text" name="name" value={profileData.name} 
                                   onChange={handleInputChange} required />
                        ) : (
                            <div className="profile-value highlight-box">{profileData.name}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        {editMode ? (
                            <input type="email" name="email" value={profileData.email} 
                                   onChange={handleInputChange} required />
                        ) : (
                            <div className="profile-value highlight-box">{profileData.email}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        {editMode ? (
                            <input type="tel" name="phone_number" 
                                   value={profileData.phone_number} onChange={handleInputChange} />
                        ) : (
                            <div className="profile-value highlight-box">
                                {profileData.phone_number || '-'}
                            </div>
                        )}
                    </div>

                    {editMode && (
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                Save Changes
                            </button>
                            <button type="button" className="btn-secondary" 
                                    onClick={handleCancelEdit}>
                                Cancel
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <div className="profile-section">
                <div className="section-header collapsible" onClick={togglePasswordSection}>
                    <h2>Change Password</h2>
                    <span className={`toggle-icon ${isPasswordSectionOpen ? 'open' : ''}`}></span>
                </div>
                
                <form onSubmit={handleChangePassword} 
                      className={`password-form ${isPasswordSectionOpen ? 'open' : ''}`}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input type="password" name="currentPassword" 
                               value={passwordFields.currentPassword} onChange={handlePasswordChange} required />
                    </div>
                    
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" name="newPassword" 
                               value={passwordFields.newPassword} onChange={handlePasswordChange} required />
                    </div>
                    
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" name="confirmNewPassword" 
                               value={passwordFields.confirmNewPassword} onChange={handlePasswordChange} required />
                    </div>
                    
                    <button type="submit" className="btn-primary">
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Profile;