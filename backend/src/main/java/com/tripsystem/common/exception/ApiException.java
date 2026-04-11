package com.tripsystem.common.exception;

import com.tripsystem.common.enums.ErrorCode;

public class ApiException extends RuntimeException {
	private final int code;

	public ApiException(int code, String message) {
		super(message);
		this.code = code;
	}

	public ApiException(ErrorCode errorCode) {
		this(errorCode.code(), errorCode.defaultMessage());
	}

	public ApiException(ErrorCode errorCode, String message) {
		this(errorCode.code(), message);
	}

	public int getCode() {
		return code;
	}
}
