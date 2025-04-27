// src/api/api.js
import axios from 'axios';

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Remove /api/v1 if it's already in the base URL to prevent duplication
const normalizedBaseURL = API_BASE_URL.endsWith('/api/v1') 
    ? API_BASE_URL
    : `${API_BASE_URL}/api/v1`;

console.log("API Base URL:", normalizedBaseURL);

// Create an axios instance with the base URL and default headers
const api = axios.create({
    baseURL: normalizedBaseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Track active requests
let activeRequests = 0;
let loadingTimeout;

// Custom event for loading state
const LOADING_EVENT = 'api-loading-state-change';

// Function to dispatch loading state changes
const dispatchLoadingState = (isLoading) => {
    window.dispatchEvent(new CustomEvent(LOADING_EVENT, { detail: { isLoading } }));
};

// --- Request Interceptor ---
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Increment active requests counter
        activeRequests++;
        
        // Set a timeout to show loading after 1 second if the request is still pending
        loadingTimeout = setTimeout(() => {
            if (activeRequests > 0) {
                dispatchLoadingState(true);
            }
        }, 1000);

        return config;
    },
    (error) => {
        console.error('[API Interceptor] Request Error:', error);
        return Promise.reject(error);
    }
);

export const sendSignupOtp = async (email) => {
    const response = await api.post('/auth/send-otp', { email });
    return response.data; // Expects { message: '...' }
};

// --- NEW: Complete Signup with OTP ---
export const completeSignup = async (signupData) => {
    // signupData should include { name, email, password, phone_number, otp }
    const response = await api.post('/auth/complete-signup', signupData);
    return response.data; // Expects { message: '...', userId: '...' } on success
};

// --- Response Interceptor ---
api.interceptors.response.use(
    (response) => {
        // Decrement active requests counter
        activeRequests--;
        
        // Clear the loading timeout
        clearTimeout(loadingTimeout);
        
        // If no more active requests, hide the loader
        if (activeRequests === 0) {
            dispatchLoadingState(false);
        }

        return response;
    },
    (error) => {
        // Decrement active requests counter even on error
        activeRequests--;
        
        // Clear the loading timeout
        clearTimeout(loadingTimeout);
        
        // If no more active requests, hide the loader
        if (activeRequests === 0) {
            dispatchLoadingState(false);
        }

        if (error.response) {
            console.error('[API Error Response]', error.response.data);
            console.error('[API Error Status]', error.response.status);
            console.error('[API Error Headers]', error.response.headers);
        } else if (error.request) {
            console.error('[API Error Request] No response received:', error.request);
        } else {
            console.error('[API Error Setup] Request setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

// =========================================
// API Function Exports
// =========================================
// Note: Most functions now omit try/catch, relying on the interceptor and the calling component's catch block.

// --- Auth ---
export const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    // Assuming login response includes { token, user }
    if (response.data.token) {
        localStorage.setItem('token', response.data.token); // Store token on successful login
    }
    return response.data; // Return all data (token, user info)
};

export const signup = async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data; // Expects { message, user, token? }
};

export const signupTheatreAdmin = async (signupData) => {
    // Endpoint specific to theatre admin signup
    const response = await api.post('/auth/theatreadminsignup', signupData);
    return response.data;
};

export const getProfile = async () => {
    const response = await api.get('/auth/me'); // Endpoint to get logged-in user's profile
    return response.data; // Expects user profile object with profile_picture
};

export const updateProfile = async (profileData) => {
    const response = await api.put('/auth/profile', profileData); // Endpoint to update profile
    return response.data.user; // Return the updated user object
};

export const changePassword = async (passwordData) => {
    const response = await api.put('/auth/password', passwordData); // Endpoint to change password
    return response.data;
};

// --- Movies ---
export const getAllMovies = async (queryParams = {}) => {
    // Allows passing query params like ?fields=title,poster_url or ?status=released
    const response = await api.get('/movies', { params: queryParams });
    return response.data; // Expects array of movies or { movies: [...] }
};

export const getMovieById = async (movieId) => {
    const response = await api.get(`/movies/${movieId}`);
    return response.data; // Expects { movie: {...} } or just the movie object
};

// Specific movie list endpoints (verify backend routes)
export const getPopularMovies = async () => {
    const response = await api.get('/movies/popular');
    return response.data;
};

export const getUpcomingMovies = async () => {
    const response = await api.get('/movies/upcoming');
    return response.data;
};

export const getNowInCinemasMovies = async () => {
    const response = await api.get('/movies/now-in-cinemas');
    return response.data;
};

// Assuming a dedicated endpoint for a paginated/full list
export const getComingSoonMoviesPage = async () => {
    const response = await api.get('/movies/coming-soon-page');
    return response.data;
};

export const searchMovies = async (query) => {
    const response = await api.get('/movies/search', { params: { query } });
    return response.data; // Expects array of matching movies
};

// --- Movie CRUD (Admin) ---
export const createMovie = async (movieData) => {
    // Admin-only endpoint to add a new movie
    const response = await api.post('/movies', movieData);
    return response.data; // Expects { message, movie }
};

export const updateMovie = async (movieId, movieData) => {
    // Admin-only endpoint to update a movie
    const response = await api.put(`/movies/${movieId}`, movieData);
    return response.data; // Expects { message, movie }
};

export const deleteMovie = async (movieId) => {
    // Admin-only endpoint to delete a movie
    const response = await api.delete(`/movies/${movieId}`);
    return response.data; // Expects { message, movieId }
};


// --- Theaters ---
export const getAllTheaters = async (queryParams = {}) => {
    // Allows filtering, e.g., ?city=Mumbai&fields=name
    const response = await api.get('/theaters', { params: queryParams });
    return response.data; // Expects array of theaters or { theaters: [...] }
};

// Search theaters by query
export const searchTheaters = async (query) => {
    const response = await api.get('/theaters/search', { params: { query } });
    return response.data; // Expects array of matching theaters
};

// Explicit function for getting theaters by city (same as above with param)
export const getTheatersByCity = async (city) => {
    const response = await api.get('/theaters', { params: { city } });
    return response.data;
};

export const getTheaterById = async (theaterId) => {
    const response = await api.get(`/theaters/${theaterId}`);
    return response.data; // Expects { theater: {...}, screens?: [...] } or similar
};

// Kept for compatibility if needed, but likely redundant with getTheaterById
export const getTheaterDetails = async (theaterId) => {
    const response = await api.get(`/theaters/${theaterId}`);
    return response.data;
};

// --- Theater CRUD (Admin / Theatre Admin) ---
export const createTheater = async (theaterData) => {
    const response = await api.post('/theaters', theaterData);
    return response.data; // Expects { message, theater }
};

export const updateTheater = async (theaterId, theaterData) => {
    const response = await api.put(`/theaters/${theaterId}`, theaterData);
    return response.data; // Expects { message, theater }
};

export const deleteTheater = async (theaterId) => {
    const response = await api.delete(`/theaters/${theaterId}`);
    return response.data; // Expects { message, theaterId }
};


// --- Screens (Nested under Theaters) ---
export const getScreensByTheater = async (theaterId) => {
    // Fetches screens specifically for a given theater
    const response = await api.get(`/theaters/${theaterId}/screens`);
    return response.data; // Expects array of screens or { screens: [...] }
};

export const createScreen = async (theaterId, screenData) => {
    // Creates a screen associated with a theater
    const response = await api.post(`/theaters/${theaterId}/screens`, screenData);
    return response.data; // Expects { message, screen }
};

export const deleteScreen = async (theaterId, screenId) => {
    // Deletes a specific screen within a theater
    const response = await api.delete(`/theaters/${theaterId}/screens/${screenId}`);
    return response.data; // Expects { message, screenId }
};

// --- Seats ---
export const getSeatLayout = async (screenId, showtimeId) => {
    const apiUrl = `/seats/screens/${screenId}/showtimes/${showtimeId}`;
    console.log(`[API Call] getSeatLayout calling: ${apiUrl}`);
    try {
        const response = await api.get(apiUrl);
        // The response is already an array of seats with is_available flag
        return response.data;
    } catch (error) {
        console.error('[API Error] getSeatLayout failed:', error);
        throw error;
    }
};

// --- Showtimes ---
export const getShowtimesByMovie = async (movieId, city, date, filters = {}) => {
    // Fetches showtimes for a specific movie, filtered by city, date, and other criteria
    const response = await api.get(`/showtimes/movies/${movieId}`, {
        params: {
            city,
            date, // YYYY-MM-DD format expected by backend
            language: filters.language,
            showTiming: filters.showTiming,
            priceRange: filters.priceRange,
            numberOfTickets: filters.numberOfTickets,
            // Add any other potential filters here
        },
    });
    return response.data; // Expects { showtimes: [...], availableLanguages: [...] }
};

// Fetches showtimes for a specific theater (e.g., for Theater Details page or Admin panel)
export const getShowtimesByTheaterId = async (theaterId, queryParams = {}) => {
    // Corrected path: /showtimes/theaters/:id
    const response = await api.get(`/showtimes/theaters/${theaterId}`, { params: queryParams });
    console.log(`[API Call] getShowtimesByTheaterId(${theaterId}) Response:`, response.data);
    return Array.isArray(response.data) ? response.data : [];
};

export const getShowtimeDetailsById = async (showtimeId) => {
    // Fetches detailed info for one specific showtime (movie, screen, theater details included)
    // Assuming backend route structure from controller: /showtimes/:showtimeId/details
    const response = await api.get(`/showtimes/${showtimeId}/details`);
    return response.data; // Expects detailed nested object
};

// --- Showtime CRUD (Admin/Theatre Admin) ---

// Create a single showtime for a specific screen
export const createShowtime = async (screenId, showtimeData) => {
    // URL includes screenId as backend controller expects it in params
    const apiUrl = `/showtimes/screens/${screenId}`;
    const response = await api.post(apiUrl, showtimeData); // Payload contains movie_id, start_time, language
    return response.data; // Expects { message, showtime }
};

export const updateShowtime = async (showtimeId, showtimeData) => {
    // Updates details of a specific showtime
    const response = await api.put(`/showtimes/${showtimeId}`, showtimeData);
    return response.data; // Expects { message, showtime }
};

// Use 'cancel' terminology to match backend logic (sets status)
export const cancelShowtime = async (showtimeId) => {
    // Cancels a showtime (likely sets status to 'cancelled')
    const response = await api.delete(`/showtimes/${showtimeId}`);
    return response.data; // Expects { message, showtimeId } or similar confirmation
};

// Creates multiple showtimes based on criteria
export const addMultipleShowtimes = async (bulkShowtimeData) => {
    // Using /multiple endpoint as assumed in AddMultipleShows.jsx
     const response = await api.post('/showtimes/multiple', bulkShowtimeData);
     return response.data; // Expects { message, count? }
};


// --- Bookings ---
export const createBooking = async (bookingData) => {
    console.log('Creating booking with data:', bookingData);
    const response = await api.post('/bookings', bookingData);
    return response.data;
};

export const getMyBookings = async () => {
    // Fetches bookings for the currently logged-in user
    // Assumes backend route is /bookings/me (protected)
    const response = await api.get('/bookings/me');
    return response.data; // Expects array of booking objects
};

export const cancelBooking = async (bookingId) => {
    // Cancels a specific booking (sets status to 'cancelled', releases seats)
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data; // Expects { message, bookingId }
};

// --- Cities ---
export const getCities = async () => {
    // Fetches a list of distinct cities where theaters exist
    // Corrected endpoint to just /cities
    const response = await api.get('/cities');
    return response.data; // Expects array of city strings: ["Mumbai", "Delhi", ...]
};

// --- Profile Picture Upload ---
export const uploadProfilePicture = async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    const response = await api.post('/users/upload-profile-picture', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Export the configured axios instance for use in components/pages
export default api;