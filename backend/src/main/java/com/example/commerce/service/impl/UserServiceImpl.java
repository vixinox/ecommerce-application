package com.example.commerce.service.impl;

import com.example.commerce.dao.UserDAO;
import com.example.commerce.dto.UserSearchDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.UserService;
import com.example.commerce.util.JwtUtil;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class UserServiceImpl implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");
    private static final Set<String> VALID_ROLES = Set.of("USER", "MERCHANT", "ADMIN");
    // 定义用户状态常量和有效状态集
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_SUSPENDED = "SUSPENDED";
    public static final String STATUS_DELETED = "DELETED";
    private static final Set<String> VALID_USER_STATUSES = Set.of(STATUS_ACTIVE, STATUS_SUSPENDED, STATUS_DELETED);

    private final UserDAO userDAO;

    @Autowired
    public UserServiceImpl(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    @Override
    public User login(String email, String password) {
        return userDAO.findByEmailAndPassword(email, password);
    }

    @Override
    public void register(User user) {
        if (userDAO.findByName(user.getUsername()) != null)
            throw new RuntimeException("用户名已被使用");

        if (userDAO.findByEmail(user.getEmail()) != null)
            throw new RuntimeException("该电子邮件地址已经与另一个用户绑定");

        if (user.getNickname() == null || user.getNickname().trim().isEmpty())
            user.setNickname(user.getUsername());

        userDAO.insertUser(user);
    }

    @Override
    public User findByName(String username) {
        return userDAO.findByName(username);
    }

    @Override
    public User findByEmail(String email) {
        return userDAO.findByEmail(email);
    }

    @Override
    public User updateUserInfo(User user, String email, String nickname) {
        String newNickname = Optional.ofNullable(nickname)
                .filter(StringUtils::hasText)
                .orElse(user.getNickname());

        String newEmail = user.getEmail();
        String username = user.getUsername();

        if (StringUtils.hasText(email) && !Objects.equals(email, user.getEmail())) {
            if (userDAO.existsByEmailAndExcludeUsername(email, username))
                throw new RuntimeException("该邮箱已与另一个账户绑定");
            newEmail = email;
        }

        userDAO.updateUser(username, newNickname, newEmail);

        return userDAO.findByName(username);
    }

    @Override
    public void deleteUser(String username) {
        userDAO.deleteByUsername(username);
    }

    @Override
    public void updatePassword(User user, String currentPassword, String newPassword) {
        if (!Objects.equals(user.getPassword(), currentPassword))
            throw new RuntimeException("旧密码错误");

        if (Objects.equals(user.getPassword(), newPassword))
            throw new RuntimeException("新密码不能与旧密码相同");

        userDAO.updatePassword(user.getUsername(), newPassword);
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
    public User checkAuthorization(String authHeader) throws RuntimeException {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            throw new RuntimeException("无效的认证请求头");

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);

        if (!JwtUtil.isTokenValid(token))
            throw new RuntimeException("认证过期");

        User user = userDAO.findByName(username);
        if (user == null)
            throw new RuntimeException("用户不存在");

        user.setPassword(null);
        return user;
    }

    @Override
    public User checkMerchant(String authHeader) throws RuntimeException {
        User user = checkAuthorization(authHeader);
        if (!Objects.equals(user.getRole(), "MERCHANT"))
            throw new RuntimeException("无权限访问该资源");

        user.setPassword(null);
        return user;
    }

    @Override
    public User checkAdmin(String authHeader) throws RuntimeException {
        User user = checkAuthorization(authHeader);
        if (!Objects.equals(user.getRole(), "ADMIN"))
            throw new RuntimeException("无权限访问该资源");

        user.setPassword(null);
        return user;
    }

    @Override
    public User checkMerchantOrAdmin(String authHeader) throws RuntimeException {
        User user = checkAuthorization(authHeader);
        if (!Objects.equals(user.getRole(), "MERCHANT") && !Objects.equals(user.getRole(), "ADMIN"))
            throw new RuntimeException("无权限访问该资源");

        user.setPassword(null);
        return user;
    }

    @Override
    public PageInfo<User> getAllUsers(int pageNum, int pageSize, String statusFilter) {
        PageHelper.startPage(pageNum, pageSize);
        List<User> users = userDAO.findAllUsers(statusFilter);
        users.forEach(user -> user.setPassword(null));
        return new PageInfo<>(users);
    }

    @Override
    @Transactional
    public void updateUserStatus(Long userId, String status) {
        if (!VALID_USER_STATUSES.contains(status)) {
            throw new IllegalArgumentException("无效的用户状态: " + status + ". 合法状态为: " + VALID_USER_STATUSES);
        }

        User user = userDAO.findById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在: " + userId);
        }
        String oldStatus = user.getStatus();
        userDAO.updateUserStatus(userId, status);
        logger.info("管理员更新了用户 '{}' 的状态: {} -> {}", userId, oldStatus, status);
    }

    @Override
    public User findUserById(Long userId) {
        if (userId == null) {
            return null; // 或者抛出异常
        }
        User user = userDAO.findById(userId);
        if (user != null) {
            user.setPassword(null); // 确保不返回密码
        }
        return user;
    }

    @Override
    @Transactional
    public void updateUserRoleAdmin(Long userId, String newRole) {
        if (!VALID_ROLES.contains(newRole)) {
            throw new IllegalArgumentException("无效的用户角色: " + newRole + ". 合法角色为: " + VALID_ROLES);
        }

        User user = userDAO.findById(userId);
        if (user == null)
            throw new RuntimeException("用户id不存在: " + userId);
        String oldRole = user.getRole();

        userDAO.updateUserRole(userId, newRole);
        logger.info("管理员更新了用户 '{}' 的角色: {} -> {}", userId, oldRole, newRole);
    }

    // 新增 softDeleteUser 实现
    @Override
    @Transactional
    public void softDeleteUser(Long userId) {
        updateUserStatus(userId, STATUS_DELETED);
        logger.info("管理员软删除了用户 '{}'", userId);
    }

    @Override
    public PageInfo<User> searchUsers(UserSearchDTO criteria, int pageNum, int pageSize) {
        logger.debug("Searching users with criteria: {}, page: {}, size: {}", criteria, pageNum, pageSize);
        PageHelper.startPage(pageNum, pageSize);
        List<User> users = userDAO.findUsersByCriteria(criteria); // This DAO method needs to be created

        // IMPORTANT: Ensure passwords are not exposed
        if (users != null) {
            users.forEach(user -> user.setPassword(null));
        }

        return new PageInfo<>(users);
    }
}