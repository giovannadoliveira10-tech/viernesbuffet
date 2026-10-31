package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.Configuracao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoRepository extends JpaRepository<Configuracao, String> {
}
