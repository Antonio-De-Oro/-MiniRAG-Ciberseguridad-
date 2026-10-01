package com.llm_rag.demo.service;

import com.llm_rag.demo.model.Consulta;
import com.llm_rag.demo.repository.ConsultaRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final ConsultaRepository consultaRepository;

    public ChatService(ChatClient.Builder builder, VectorStore vectorStore, ConsultaRepository consultaRepository) {
        this.consultaRepository = consultaRepository;

        // Configuramos la búsqueda: traer los 4 fragmentos más relevantes con similitud > 0.50
        SearchRequest searchRequest = SearchRequest.builder()
                .topK(4)
                .similarityThreshold(0.50)
                .build();

        QuestionAnswerAdvisor ragAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
                .searchRequest(searchRequest)
                .build();

        this.chatClient = builder
                .defaultSystem("""
                        Eres un experto en ciberseguridad y gestión de redes.
                        Responde utilizando EXCLUSIVAMENTE la información recuperada de la base documental.
                        Si la información necesaria no está disponible en el contexto proporcionado, responde EXACTAMENTE:
                        "No encuentro esa información en los documentos disponibles."
                        No inventes información. Responde de manera clara, breve y técnicamente correcta.
                        """)
                .defaultAdvisors(ragAdvisor)
                .build();
    }

    public String preguntar(String pregunta) {
        // Llamada a Gemini utilizando RAG
        String respuesta = chatClient.prompt()
                .user(pregunta)
                .call()
                .content();

        // Guardar el historial en MariaDB
        Consulta consulta = new Consulta(pregunta, respuesta);
        consultaRepository.save(consulta);

        return respuesta;
    }
}