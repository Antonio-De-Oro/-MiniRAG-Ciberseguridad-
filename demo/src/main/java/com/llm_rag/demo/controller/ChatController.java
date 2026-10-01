package com.llm_rag.demo.controller;

import com.llm_rag.demo.model.Consulta;
import com.llm_rag.demo.repository.ConsultaRepository;
import com.llm_rag.demo.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatService chatService;
    private final ConsultaRepository consultaRepository;

    public ChatController(ChatService chatService, ConsultaRepository consultaRepository) {
        this.chatService = chatService;
        this.consultaRepository = consultaRepository;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> preguntar(@RequestBody Map<String, String> body) {
        String pregunta = body.get("pregunta");
        if (pregunta == null || pregunta.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("respuesta", "Debe ingresar una pregunta."));
        }

        try {
            String respuesta = chatService.preguntar(pregunta);
            return ResponseEntity.ok(Map.of("respuesta", respuesta));
        } catch (Exception e) {
            e.printStackTrace();
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            String detalle = root.getMessage() != null ? root.getMessage() : e.getMessage();
            return ResponseEntity.status(500).body(Map.of(
                    "respuesta", "Error en el servidor: " + detalle
            ));
        }
    }

    @GetMapping("/consultas")
    public List<Consulta> historial() {
        return consultaRepository.findAll();
    }

    @GetMapping("/salud")
    public Map<String, String> salud() {
        return Map.of(
                "estado", "OK",
                "aplicacion", "MiniRAG Ciberseguridad"
        );
    }
}