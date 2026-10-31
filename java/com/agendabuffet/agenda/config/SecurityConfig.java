package com.agendabuffet.agenda.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            .authorizeHttpRequests(a -> a
                .requestMatchers("/login.html", "/esqueci.html", "/redefinir.html", "/css/**", "/fonts/**", "/img/**", "/api/esqueci-senha", "/api/redefinir-senha").permitAll()
                .requestMatchers("/api/usuarios/**").hasRole("ADMIN")                 // gestão de usuários: só ADMIN
                .requestMatchers(HttpMethod.POST, "/api/me/senha").authenticated()    // trocar a própria senha: qualquer logado
                .requestMatchers(HttpMethod.GET, "/api/**").authenticated()
                .requestMatchers("/api/**").hasRole("ADMIN")                          // criar, editar e excluir: só ADMIN
                .anyRequest().authenticated())
            .formLogin(f -> f
                .loginPage("/login.html")
                .loginProcessingUrl("/login")
                .defaultSuccessUrl("/", true)
                .failureUrl("/login.html?erro")
                .permitAll())
            .logout(l -> l.logoutSuccessUrl("/login.html"));
        return http.build();
    }

    // força o envio do cookie XSRF-TOKEN em todas as páginas, inclusive a tela de login
    static class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            CsrfToken token = (CsrfToken) request.getAttribute("_csrf");
            if (token != null) token.getToken();
            chain.doFilter(request, response);
        }
    }
}