package com.example.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.List;

/**
 * 用户管理 Controller
 * 提供用户的增删改查接口
 *
 * @author PostEasy
 * @since 1.0.0
 */
@RestController
@RequestMapping("/api/user")
@Tag(name = "用户管理")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * 创建新用户
     * 接收用户信息并保存到数据库
     *
     * @param request 用户创建请求
     * @return 创建的用户信息
     */
    @PostMapping("/create")
    @Operation(summary = "创建用户", description = "创建一个新的用户账号")
    public R<UserVO> createUser(@Valid @RequestBody CreateUserRequest request) {
        return R.ok(userService.create(request));
    }

    /**
     * 根据ID获取用户详情
     */
    @GetMapping("/{id}")
    public R<UserVO> getUser(@PathVariable("id") Long id) {
        return R.ok(userService.getById(id));
    }

    /**
     * 分页查询用户列表
     */
    @GetMapping("/list")
    public R<List<UserVO>> listUsers(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "10") @Max(100) Integer size,
            @RequestParam(value = "keyword", required = false) String keyword) {
        return R.ok(userService.list(page, size, keyword));
    }

    /**
     * 更新用户信息
     */
    @PutMapping("/{id}")
    public R<UserVO> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return R.ok(userService.update(id, request));
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/{id}")
    public R<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return R.ok();
    }

    /**
     * 上传用户头像
     */
    @PostMapping("/{id}/avatar")
    public R<String> uploadAvatar(
            @PathVariable Long id,
            @RequestPart MultipartFile file) {
        return R.ok(userService.uploadAvatar(id, file));
    }

    /**
     * 已废弃的接口 - 使用 /list 替代
     */
    @Deprecated
    @GetMapping("/all")
    public R<List<UserVO>> getAllUsers() {
        return R.ok(userService.listAll());
    }
}
