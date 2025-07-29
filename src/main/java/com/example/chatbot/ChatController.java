package com.example.chatbot;

import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@Controller
public class ChatController {

    private final OpenAiChatModel chatModel;
    private final List<String> botPrompts = Arrays.asList(
            "What's the weather today?",
            "Tell me a joke.",
            "How can I improve my productivity?",
            "Give me a fun fact."
    );

    @PostMapping("/suggest-prompts")
    @ResponseBody
    public List<String> suggestPrompts(@RequestParam String conversation) {
        String systemPrompt = "You are a conversational assistant. When given a user–assistant chat, generate 3 quick-reply suggestions formatted as simple bullet points. Do not include any headings, introductions, footers, or explanations—only the bullets.\n\nConversation:\n" +
                conversation;
        String response = chatModel.call(new Prompt(systemPrompt)).getResult().getOutput().getText();
        List<String> prompts = Arrays.asList(response.split("\\r?\\n"));
        return prompts;
    }

    public ChatController(OpenAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/")
    public String chat(Model model) {
        model.addAttribute("botPrompts", botPrompts);
        return "chat";
    }

    @PostMapping("/send")
    @ResponseBody
    public String sendMessage(@RequestParam String message) {
        return chatModel.call(new Prompt(message)).getResult().getOutput().getText();
    }
}