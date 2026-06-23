const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/raahesystem';

const connectDB = async (uri) => {
    const mongoUri = uri || process.env.MONGO_URI || DEFAULT_MONGO_URI;
    if (!process.env.MONGO_URI) {
        console.warn('MONGO_URI is not set. Falling back to local MongoDB URI:', DEFAULT_MONGO_URI);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = {connectDB};
