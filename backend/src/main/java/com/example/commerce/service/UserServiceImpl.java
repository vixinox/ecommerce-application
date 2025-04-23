package com.example.commerce.service;

import com.example.commerce.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.example.commerce.dao.UserDAO;
import com.example.commerce.model.User;

import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserServiceImpl implements UserService {
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    @Autowired
    private UserDAO userDao;

    @Override
    public User login(String email, String password) {
        return userDao.findByEmailAndPassword(email, password);
    }

    @Override
    public void register(User user) {
        if (userDao.findByName(user.getUsername()) != null)
            throw new RuntimeException("用户名已被使用");

        if (userDao.findByEmail(user.getEmail()) != null)
            throw new RuntimeException("该电子邮件地址已经与另一个用户绑定");

        if (user.getNickname() == null || user.getNickname().trim().isEmpty())
            user.setNickname(user.getUsername());

        userDao.insertUser(user);
    }

    @Override
    public User findByName(String username) {
        return userDao.findByName(username);
    }

    @Override
    public User findByEmail(String email) {
        return userDao.findByEmail(email);
    }

    @Override
    public void updateUserInfo(User user, String email, String nickname) {
        String newNickname = Optional.ofNullable(nickname)
                .filter(StringUtils::hasText)
                .orElse(user.getNickname());

        String newEmail = user.getEmail();
        String username = user.getUsername();

        if (StringUtils.hasText(email) && !Objects.equals(email, user.getEmail())) {
            if (userDao.existsByEmailAndExcludeUsername(email, username))
                throw new RuntimeException("该邮箱已与另一个账户绑定");
            newEmail = email;
        }

        userDao.updateUser(username, newNickname, newEmail);
    }

    @Override
    public void deleteUser(String username) {
        userDao.deleteByUsername(username);
    }

    @Override
    public void updatePassword(User user, String currentPassword, String newPassword) {
        if (!Objects.equals(user.getPassword(), currentPassword))
            throw new RuntimeException("旧密码错误");

        if (Objects.equals(user.getPassword(), newPassword))
            throw new RuntimeException("新密码不能与旧密码相同");

        userDao.updatePassword(user.getUsername(), newPassword);
    }

    @Override
    public void checkUsername(String username) {
        if (username == null || username.isEmpty())
            throw new RuntimeException("请输入用户名");
        if (username.length() > 20)
            throw new RuntimeException("用户名不能超过 20 个字符");
        if (!USERNAME_PATTERN.matcher(username).matches())
            throw new RuntimeException("用户名只能包含字母、数字和下划线");
        if (findByName(username) != null)
            throw new RuntimeException("用户名已被使用");
    }

    @Override
    public void checkEmail(String email) {
        if (email == null || email.isEmpty())
            throw new RuntimeException("请输入电子邮件地址");
        if (!isValidEmail(email))
            throw new RuntimeException("请输入有效的电子邮件地址");
        if (findByEmail(email) != null)
            throw new RuntimeException("该电子邮件地址已经与另一个用户绑定");
    }

    @Override
    public void checkNickname(String nickname) {
        if (nickname != null)
            if (nickname.length() > 30)
                throw new RuntimeException("昵称不能超过 30 个字符");
    }

    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$";
        return Pattern.compile(emailRegex).matcher(email).matches();
    }

    @Override
    public User checkAuthorization(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            throw new RuntimeException("无效的认证请求头");

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);

        if (!JwtUtil.isTokenValid(token))
            throw new RuntimeException("认证过期");

        User user = userDao.findByName(username);
        if (user == null)
            throw new RuntimeException("用户不存在");

        return user;
    }
}