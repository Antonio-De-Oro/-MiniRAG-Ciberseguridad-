package com.llm_rag.demo.repository;

import com.llm_rag.demo.model.Consulta;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultaRepository extends JpaRepository<Consulta, Long> {
}