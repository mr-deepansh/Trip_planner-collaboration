import { User } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateAccessTokens = async (userId) => {
    try {
        const user = await User.findByPk(userId);
        const accessToken = user.generateAccessToken();
        return accessToken;
    } catch {
        throw new ApiError(
            500,
            'Something went wrong while generating access token'
        );
    }
};

export const handleOAuthLogin = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.redirect(
            `${process.env.CORS_ORIGIN}/login?error=OAuthFailed`
        );
    }
    const accessToken = await generateAccessTokens(req.user.id);
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };
    res.cookie('accessToken', accessToken, options);
    res.redirect(`${process.env.CORS_ORIGIN}/`);
});

export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        throw new ApiError(400, 'All fields are required');
    }
    const existedUser = await User.findOne({ where: { email } });
    if (existedUser) {
        throw new ApiError(409, 'User with email already exists');
    }
    const user = await User.create({
        name,
        email,
        password
    });

    const createdUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] }
    });

    if (!createdUser) {
        throw new ApiError(
            500,
            'Something went wrong while registering the user'
        );
    }
    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, 'User registered successfully')
        );
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new ApiError(404, 'User does not exist');
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials');
    }
    const accessToken = await generateAccessTokens(user.id);
    const loggedInUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] }
    });
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };
    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken
                },
                'User logged in successfully'
            )
        );
});

export const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };
    return res
        .status(200)
        .clearCookie('accessToken', options)
        .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, 'User details fetched successfully')
        );
});
