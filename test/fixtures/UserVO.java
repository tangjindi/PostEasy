package com.example.vo;

import java.time.LocalDateTime;

/**
 * 用户视图对象
 */
public class UserVO {

    @Schema(description = "用户ID")
    private Long id;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "邮箱")
    private String email;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "性别")
    private String gender;

    @Schema(description = "创建时间")
    private LocalDateTime createTime;

    // 手机号
    private String phone;
}
