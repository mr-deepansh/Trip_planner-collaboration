class ApiResponse {
  constructor({
    statusCode = 200,
    message = 'Success',
    data = null,
    meta = null
  }) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta !== null) {
      this.meta = meta;
    }
  }

  // 200 — GET, PUT
  static success(data, message = 'Success', meta = null) {
    return new ApiResponse({ statusCode: 200, message, data, meta });
  }

  // 201 — POST (create)
  static created(data, message = 'Created', meta = null) {
    return new ApiResponse({ statusCode: 201, message, data, meta });
  }

  // 204 — DELETE, logout (no content)
  static noContent() {
    return new ApiResponse({ statusCode: 204, message: 'No Content' });
  }

  // Paginated list — meta auto populated
  static paginated(data, { page, limit, total }, message = 'Success') {
    return new ApiResponse({
      statusCode: 200,
      message,
      data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  }
}

export default ApiResponse;
