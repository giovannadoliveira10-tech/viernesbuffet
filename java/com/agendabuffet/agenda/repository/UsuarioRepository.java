package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    long countByPerfil(String perfil);
}