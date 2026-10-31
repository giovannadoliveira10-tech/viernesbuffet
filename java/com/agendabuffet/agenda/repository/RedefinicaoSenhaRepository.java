package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.RedefinicaoSenha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RedefinicaoSenhaRepository extends JpaRepository<RedefinicaoSenha, Long> {
    Optional<RedefinicaoSenha> findByTokenHash(String tokenHash);

    List<RedefinicaoSenha> findByUsuarioIdAndUsadoFalse(Long usuarioId);

    boolean existsByUsuarioIdAndUsadoFalseAndExpiraEmAfter(Long usuarioId, LocalDateTime limite);
}

