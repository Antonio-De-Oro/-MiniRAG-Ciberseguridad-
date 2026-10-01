package com.llm_rag.demo.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentService {
    private final VectorStore vectorStore;

    public DocumentService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @PostConstruct
    public void cargarDocumentos() throws IOException {
        System.out.println("----------------------------------------");
        System.out.println("CARGANDO DOCUMENTOS DE CIBERSEGURIDAD PARA RAG");
        System.out.println("----------------------------------------");

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:documentos/*.txt");
        List<Document> documentos = new ArrayList<>();

        for (Resource resource : resources) {
            System.out.println("Leyendo: " + resource.getFilename());
            TextReader reader = new TextReader(resource);
            documentos.addAll(reader.get());
        }

        System.out.println("Documentos encontrados: " + documentos.size());

        TokenTextSplitter splitter = TokenTextSplitter.builder()
                .withChunkSize(300)
                .build();
        List<Document> chunks = splitter.apply(documentos);

        System.out.println("Chunks generados: " + chunks.size());
        vectorStore.add(chunks);
        System.out.println("Embeddings locales almacenados correctamente.");
        System.out.println("----------------------------------------");
    }
}