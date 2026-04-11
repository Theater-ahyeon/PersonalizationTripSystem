package com.tripsystem.common.exception;

import com.tripsystem.common.api.ApiResponse;
import com.tripsystem.common.enums.ErrorCode;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ApiException.class)
	public ApiResponse<Void> handleApiException(ApiException e) {
		return ApiResponse.fail(e.getCode(), e.getMessage());
	}

	@ExceptionHandler({
			MethodArgumentNotValidException.class,
			BindException.class,
			ConstraintViolationException.class,
			HttpMessageNotReadableException.class,
			IllegalArgumentException.class
	})
	public ApiResponse<Void> handleBadRequest(Exception e) {
		return ApiResponse.fail(ErrorCode.BAD_REQUEST.code(), e.getMessage());
	}

	@ExceptionHandler(Exception.class)
	public ApiResponse<Void> handleUnexpected(Exception e) {
		return ApiResponse.fail(ErrorCode.INTERNAL_ERROR.code(), ErrorCode.INTERNAL_ERROR.defaultMessage());
	}
}
