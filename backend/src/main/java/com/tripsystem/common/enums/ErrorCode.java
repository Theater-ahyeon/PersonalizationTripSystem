package com.tripsystem.common.enums;

public enum ErrorCode {
	BAD_REQUEST(40001, "参数错误"),
	NOT_FOUND(40401, "资源不存在"),
	INTERNAL_ERROR(50000, "系统内部错误");

	private final int code;
	private final String defaultMessage;

	ErrorCode(int code, String defaultMessage) {
		this.code = code;
		this.defaultMessage = defaultMessage;
	}

	public int code() {
		return code;
	}

	public String defaultMessage() {
		return defaultMessage;
	}
}
