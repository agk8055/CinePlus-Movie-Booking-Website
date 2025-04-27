# 🎬 CinePlus – Movie Ticket Booking Web App

CinePlus is a full-stack movie ticket booking web application. It allows users to browse movies, select their city and cinema, check show timings, and book tickets through a smooth and responsive interface.

---

## ✨ Features

- 🎥 Browse movies with posters and descriptions  
- 🏙 Filter by city to view cinemas and available shows  
- 🕒 View show timings and details  
- 🎟 Book movie tickets quickly and easily  
- 💳 Integrated demo-mode payment gateway (switchable to live)  
- ☁ MongoDB Atlas cloud-hosted database  

---

## 🛠 Tech Stack

*Frontend:*  
- React.js (Vite-powered)  
- Basic CSS (no framework)  

*Backend:*  
- Node.js + Express.js  
- RESTful APIs  

*Database:*  
- MongoDB Atlas (NoSQL, cloud-hosted)  

---

## 🚀 Getting Started

### 📁 Clone the Repository

bash
git clone https://github.com/your-username/cineplus.git
cd cineplus

---
## 🔧 Environment Setup (.env Files)

*🔹 Backend – /backend/.env*
-Create a .env file inside the backend folder with the following variables:

env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
# Razorpay Configuration
RAZORPAY_KEY_ID=your_api_key
RAZORPAY_KEY_SECRET=your_secret_key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_username
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret_key

*🔹 Frontend – /frontend/.env*
-Create a .env file inside the frontend folder with:
env
VITE_RAZORPAY_KEY_ID=your_api_key

-⚠ Make sure to replace the placeholder values with your actual credentials and URIs.
---
## ▶ Running the App
*🔹 Start the Backend Server*
bash
cd backend
npm install
npm run dev

-The backend server will start at: http://localhost:5000

*🔹 Start the Frontend Development Server*
bash
cd frontend
npm install
npm run dev
