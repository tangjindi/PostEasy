package com.example.dto;

import javax.validation.constraints.*;

/**
 * 创建用户请求
 */
public class CreateUserRequest {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 20)
    @Schema(description = "用户登录名")
    private String username;

    @NotBlank
    @Email
    @Schema(description = "邮箱地址")
    private String email;

    @Size(min = 6, max = 32)
    @Schema(description = "登录密码")
    private String password;

    @Schema(description = "用户昵称")
    private String nickname;

    @Schema(description = "性别")
    private Gender gender;

    // 年龄 — 测试双斜杠注释提取
    private Integer age;

    /**
     * 手机号 — 测试 Javadoc 注释提取
     */
    private String phone;
}
