# API Routes Documentation

This document contains a comprehensive list of all the API routes available in the application, along with their descriptions, required parameters, and expected request bodies.

## General Information

- **Base URL:** `/api/v1`
- **Authentication:** Most routes require a valid JWT which is typically stored in cookies as `accessToken`.
- **Response Format:** Most responses follow a standard structure (`ApiResponse` class pattern) returning `statusCode`, `data`, and `message` properties.

---

## 1. Health Check (`/api/v1/health`)

### `GET /api/v1/health`

- **Description:** Basic health check endpoint to verify that the API server is running correctly.
- **Security:** Public
- **Request Parameters:** None
- **Request Body:** None
- **Response:**
  - `200 OK`: `{ "status": "success", "message": "API is running" }`

---

## 2. Authentication API (`/api/v1/auth`)

### `POST /api/v1/auth/register`

- **Description:** Registers a new user account.
- **Security:** Public
- **Request Parameters:** None
- **Request Body:**

  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```

  - `name` (String, Required)
  - `email` (String, Required)
  - `password` (String, Required)

- **Response:** `201 Created` with the registered user's details (password excluded).

### `POST /api/v1/auth/login`

- **Description:** Authenticates a user and sets an `accessToken` cookie.
- **Security:** Public
- **Request Parameters:** None
- **Request Body:**

  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```

  - `email` (String, Required)
  - `password` (String, Required)

- **Response:** `200 OK` with user details (excluding password) and the `accessToken`. Set-Cookie header is sent.

### `POST /api/v1/auth/logout`

- **Description:** Logs out a currently authenticated user by clearing the `accessToken` cookie.
- **Security:** Requires JWT Token
- **Request Parameters:** None
- **Request Body:** None
- **Response:** `200 OK`

### `GET /api/v1/auth/me`

- **Description:** Fetches the profile details of the currently logged-in user.
- **Security:** Requires JWT Token
- **Request Parameters:** None
- **Request Body:** None
- **Response:** `200 OK` with the authenticated user object.

### `GET /api/v1/auth/google`

- **Description:** Initiates the Google OAuth login/registration flow. Redirects the user to Google.
- **Security:** Public

### `GET /api/v1/auth/google/callback`

- **Description:** The callback endpoint for Google OAuth. On success, sets the `accessToken` in a secure HTTP-Only cookie and redirects the user to the frontend application.
- **Security:** Public (Handles Google callback logic internally)

### `GET /api/v1/auth/github`

- **Description:** Initiates the GitHub OAuth login/registration flow. Redirects the user to GitHub.
- **Security:** Public

### `GET /api/v1/auth/github/callback`

- **Description:** The callback endpoint for GitHub OAuth. On success, sets the `accessToken` in a secure HTTP-Only cookie and redirects the user to the frontend application.
- **Security:** Public (Handles GitHub callback logic internally)

---

## 3. Trips API (`/api/v1/trips`)

_All trip routes require standard JWT authentication._

### `POST /api/v1/trips/`

- **Description:** Creates a new trip. Assigns the creator as the `OWNER` and automatically generates the associated `Day` records for the date span provided.
- **Security:** Requires JWT Token
- **Request Parameters:** None
- **Request Body:**

  ```json
  {
    "title": "Summer Vacation",
    "start_date": "2026-06-01",
    "end_date": "2026-06-15"
  }
  ```

  - `title` (String, Required)
  - `start_date` (Date string, Required)
  - `end_date` (Date string, Required)

- **Response:** `201 Created` with the newly created trip details.

### `GET /api/v1/trips/`

- **Description:** Fetches a list of all trips the authenticated user is a member of (irrespective of their role).
- **Security:** Requires JWT Token
- **Request Parameters:** None
- **Request Body:** None
- **Response:** `200 OK` with an array of trip objects.

### `GET /api/v1/trips/:tripId`

- **Description:** Fetches deeply nested details of a specific trip. The structure includes all corresponding `Day` entities alongside their respective nested `Activity` arrays, securely ordered by date.
- **Security:** Requires JWT Token & Role Authorization (`OWNER`, `EDITOR`, or `VIEWER` access to the trip).
- **Request Parameters:**
  - `tripId` (UUID string, Required)
- **Request Body:** None
- **Response:** `200 OK` with the extended Trip entity populated with Days and Activities.

---

## 4. Activities API (`/api/v1/trips/:tripId/activities`)

_All activity routes require JWT authentication AND are scoped under a specific trip._

### `POST /api/v1/trips/:tripId/activities/`

- **Description:** Adds a new activity to a specific day within the given trip. It automatically assigns the correct `order_index` at the end of the day's existing activity list.
- **Security:** Requires JWT Token & Role Authorization (`OWNER` or `EDITOR` access over the trip).
- **Request Parameters:**
  - `tripId` (UUID string, Required)
- **Request Body:**

  ```json
  {
    "dayId": "uuid-for-a-specific-day",
    "title": "Visit Eiffel Tower",
    "description": "Book tickets in advance",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "type": "sightseeing"
  }
  ```

  - `dayId` (UUID string, Required)
  - `title` (String, Required)
  - `description` (String, Optional)
  - `start_time` (Time string, Optional)
  - `end_time` (Time string, Optional)
  - `type` (String, Optional)

- **Response:** `201 Created` with the new activity object.

### `POST /api/v1/trips/:tripId/activities/reorder`

- **Description:** Reorders a subset of activities. Useful for drag-and-drop mechanics to save new indexing orders to the database.
- **Security:** Requires JWT Token & Role Authorization (`OWNER` or `EDITOR` access over the trip).
- **Request Parameters:**
  - `tripId` (UUID string, Required)
- **Request Body:**

  ```json
  {
    "activities": [
      { "id": "uuid-activity-1", "order_index": 0 },
      { "id": "uuid-activity-2", "order_index": 1 }
    ]
  }
  ```

  - `activities` (Array of objects, Required): Each object must define the activity `id` and the new `order_index` (zero-indexed).

- **Response:** `200 OK` on successful reorder.

### `PUT /api/v1/trips/:tripId/activities/:activityId`

- **Description:** Updates details of an existing activity.
- **Security:** Requires JWT Token & Role Authorization (`OWNER` or `EDITOR` access over the trip).
- **Request Parameters:**
  - `tripId` (UUID string, Required)
  - `activityId` (UUID string, Required)
- **Request Body:** Any valid fields corresponding to an Activity (e.g., `title`, `description`, `start_time`, `end_time`, `type`, `DayId`, `order_index`).
- **Response:** `200 OK` with the full modified activity object.

### `DELETE /api/v1/trips/:tripId/activities/:activityId`

- **Description:** Deletes a specific activity permanently.
- **Security:** Requires JWT Token & Role Authorization (`OWNER` or `EDITOR` access over the trip).
- **Request Parameters:**
  - `tripId` (UUID string, Required)
  - `activityId` (UUID string, Required)
- **Request Body:** None
- **Response:** `200 OK` on successful deletion.
