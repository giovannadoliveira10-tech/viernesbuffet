package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.RedefinicaoSenha;
import com.agendabuffet.agenda.model.Usuario;
import com.agendabuffet.agenda.repository.RedefinicaoSenhaRepository;
import com.agendabuffet.agenda.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class RecuperarSenhaController {

    private static final Logger log = LoggerFactory.getLogger(RecuperarSenhaController.class);
    private static final int VALIDADE_MIN = 30;
    private static final String INVALIDO = "Este link é inválido ou já expirou. Peça um novo link na tela de login.";
    private static final SecureRandom RANDOM = new SecureRandom();

    public record PedidoEmail(String email) {}
    public record NovaSenha(String token, String novaSenha) {}

    private final UsuarioRepository usuarios;
    private final RedefinicaoSenhaRepository tokens;
    private final PasswordEncoder encoder;
    private final ObjectProvider<JavaMailSender> mail;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${spring.mail.username:}")
    private String remetente;

    public RecuperarSenhaController(UsuarioRepository usuarios, RedefinicaoSenhaRepository tokens,
                                    PasswordEncoder encoder, ObjectProvider<JavaMailSender> mail) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.encoder = encoder;
        this.mail = mail;
    }

    // ---------- 1) pedir o link ----------
    @PostMapping("/esqueci-senha")
    @Transactional
    public ResponseEntity<Map<String, String>> pedir(@RequestBody PedidoEmail p) {
        String email = p.email() == null ? "" : p.email().trim();
        if (!email.isEmpty()) usuarios.findByEmail(email).ifPresent(this::criarEEnviar);

        // a resposta é sempre a mesma, exista o e-mail ou não (não revela quem tem conta)
        return ResponseEntity.ok(Map.of("mensagem",
            "Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha."));
    }

    private void criarEEnviar(Usuario u) {
        LocalDateTime agora = LocalDateTime.now();

        // já existe um pedido feito há menos de 2 minutos: não manda outro
        if (tokens.existsByUsuarioIdAndUsadoFalseAndExpiraEmAfter(u.id, agora.plusMinutes(VALIDADE_MIN - 2))) return;

        // links antigos deixam de valer
        var antigos = tokens.findByUsuarioIdAndUsadoFalse(u.id);
        antigos.forEach(t -> t.usado = true);
        tokens.saveAll(antigos);

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RedefinicaoSenha r = new RedefinicaoSenha();
        r.usuarioId = u.id;
        r.tokenHash = hash(token);
        r.expiraEm = agora.plusMinutes(VALIDADE_MIN);
        r.usado = false;
        tokens.save(r);

        String link = baseUrl.replaceAll("/+$", "") + "/redefinir.html?token=" + token;
        enviar(u, link);
    }

    private void enviar(Usuario u, String link) {
        JavaMailSender m = mail.getIfAvailable();
        if (m == null) {
            // e-mail ainda não configurado: o link aparece no terminal (útil para testar)
            log.warn("E-mail não configurado. Link de redefinição para {}: {}", u.email, link);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            if (!remetente.isBlank()) msg.setFrom(remetente);
            msg.setTo(u.email);
            msg.setSubject("Redefinição de senha – Agenda Viernes Buffet");
            msg.setText("Olá, " + u.nome + "!\n\n"
                + "Recebemos um pedido para redefinir a sua senha. Para criar uma nova, abra o link abaixo "
                + "(ele vale por " + VALIDADE_MIN + " minutos e só pode ser usado uma vez):\n\n"
                + link + "\n\n"
                + "Se você não fez esse pedido, ignore este e-mail. A sua senha continua a mesma.");
            m.send(msg);
        } catch (Exception e) {
            log.error("Falha ao enviar o e-mail de redefinição para {}: {}", u.email, e.getMessage());
        }
    }

    // ---------- 2) gravar a nova senha ----------
    @PostMapping("/redefinir-senha")
    @Transactional
    public ResponseEntity<?> redefinir(@RequestBody NovaSenha n) {
        if (n.novaSenha() == null || n.novaSenha().length() < 10) return erro("A senha precisa ter pelo menos 10 caracteres.");
        if (n.novaSenha().length() > 72) return erro("A senha pode ter no máximo 72 caracteres.");
        if (n.token() == null || n.token().isBlank()) return erro(INVALIDO);

        RedefinicaoSenha r = tokens.findByTokenHash(hash(n.token().trim())).orElse(null);
        if (r == null || r.usado || r.expiraEm.isBefore(LocalDateTime.now())) return erro(INVALIDO);

        Usuario u = usuarios.findById(r.usuarioId).orElse(null);
        if (u == null) return erro(INVALIDO);

        u.senhaHash = encoder.encode(n.novaSenha());
        usuarios.save(u);
        r.usado = true;
        tokens.save(r);
        return ResponseEntity.noContent().build();
    }

    // ---------- apoio ----------
    private ResponseEntity<Map<String, String>> erro(String msg) {
        return ResponseEntity.badRequest().body(Map.of("erro", msg));
    }

    private static String hash(String token) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}

