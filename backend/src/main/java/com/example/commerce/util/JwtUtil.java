package com.example.commerce.util;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
public class JwtUtil {
    private static final String SECRET_KEY = "t241tf341gv34ef43efg43g145146135514614634wef24ef3442ef43e234567890";
    private static final long EXPIRATION_TIME = 86400000;
    private static final Key key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET_KEY));
    public static String generateToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", username);
        claims.put("created", new Date());
        return Jwts.builder()
                .setClaims(claims)
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
    public static Claims getClaimsFromToken(String token) {
        try {
            return Jwts.parser()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            return null;
        }
    }
    public static String getUsernameFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims != null ? claims.getSubject() : null;
    }
    public static boolean isTokenValid(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims != null && !isTokenExpired(claims);
    }
    private static boolean isTokenExpired(Claims claims) {
        return claims.getExpiration().before(new Date());
    }
}