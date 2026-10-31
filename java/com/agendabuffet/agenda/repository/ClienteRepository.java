package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.Cliente;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    @Query("""
        select c from Cliente c
        where lower(concat(c.nome, ' ', coalesce(c.sobrenome, ''))) like lower(concat('%', :q, '%'))
           or c.telefone1 like concat('%', :q, '%')
           or c.telefone2 like concat('%', :q, '%')
        order by c.nome, c.sobrenome
        """)
    List<Cliente> buscar(@Param("q") String q, Pageable pageable);
}