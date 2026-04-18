import { useState } from 'react';
import { useAI } from '../lib/ai-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, AlignLeft, MessageSquare, ListTree, BookOpen, Loader2 } from 'lucide-react';
import { Editor } from '@tiptap/react';

export default function WritingAgentsMenu({ editor }: { editor: Editor }) {
  const { ai } = useAI();
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);

  const applyAgent = async (agentName: string, promptInstruction: string | string[], action: 'replace' | 'append' = 'replace') => {
    if (!editor) return;
    
    setLoadingAgent(agentName);
    
    try {
      const { from, to, empty } = editor.state.selection;
      
      let textToProcess = '';
      let replaceFrom = from;
      let replaceTo = to;
      
      if (!empty) {
        textToProcess = editor.state.doc.textBetween(from, to, '\n');
      } else {
        // If no selection, process the current block (e.g., paragraph) instead of the whole document
        const $from = editor.state.selection.$from;
        const depth = $from.depth;
        
        if (depth > 0) {
          replaceFrom = $from.before(depth);
          replaceTo = $from.after(depth);
          textToProcess = editor.state.doc.textBetween($from.start(depth), $from.end(depth), '\n');
        } else {
          // Fallback if at doc level
          textToProcess = editor.getText();
          replaceFrom = 0;
          replaceTo = editor.state.doc.content.size;
        }
      }

      if (!textToProcess.trim() || textToProcess === '<p></p>') {
        setLoadingAgent(null);
        return;
      }

      let currentText = textToProcess;
      const prompts = Array.isArray(promptInstruction) ? promptInstruction : [promptInstruction];

      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `${currentPrompt}\n\nHere is the text to process:\n\n${currentText}`,
          config: {
            systemInstruction: "You are an expert writing and formatting assistant. You must return ONLY the processed text, formatted in HTML suitable for a rich text editor (using tags like <p>, <h1>, <h2>, <strong>, <em>, <ul>, <li>, etc. if appropriate). If the input contains HTML, preserve the structure unless instructed otherwise. Do NOT include markdown code blocks (like ```html). Do NOT include any conversational filler. Just the raw HTML output."
          }
        });

        if (response.text) {
          currentText = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '');
        }
      }

      if (currentText) {
        if (action === 'append') {
          editor.chain().focus().setTextSelection(replaceTo).insertContent('<br/>' + currentText).run();
        } else {
          editor.chain().focus().deleteRange({ from: replaceFrom, to: replaceTo }).insertContent(currentText).run();
        }
      }

    } catch (error) {
      console.error(`Error running ${agentName}:`, error);
    } finally {
      setLoadingAgent(null);
    }
  };

  const agents = [
    {
      id: 'auto-format',
      name: 'Layout & Formatting Agent',
      icon: <AlignLeft className="h-4 w-4 mr-2" />,
      description: 'Fix spacing, layout collisions, and boundary overflows',
      prompt: 'Please act as a professional Typesetter and Layout Editor. Evaluate the following text and fix any formatting boundaries. If there are objects or images mentioned, add appropriate CSS floats (e.g., float-left, float-right) to ensure text wraps nicely around them without collision. Correct spacing, fix alignment, repair broken tags, ensure paragraph breaks are clean, and manage chapter or section boundaries effectively so content structurally respects the constraints of a physical printed page. Only return valid HTML.'
    },
    {
      id: 'tone-consistency',
      name: 'Tone Consistency Agent',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      description: 'Ensure a consistent tone throughout',
      prompt: 'Please rewrite the following text to ensure a consistent, professional, and engaging tone throughout. Smooth out any awkward transitions and make the voice sound unified.'
    },
    {
      id: 'paragraph-restructure',
      name: 'Paragraph Restructuring Agent',
      icon: <ListTree className="h-4 w-4 mr-2" />,
      description: 'Improve flow and readability of paragraphs',
      prompt: 'Please restructure the following text to improve flow and readability. Break up overly long paragraphs, combine choppy sentences, and ensure each paragraph has a clear main idea. Use HTML <p> tags.'
    },
    {
      id: 'chapter-structure',
      name: 'Chapter Structuring Agent',
      icon: <BookOpen className="h-4 w-4 mr-2" />,
      description: 'Organize content into logical sections/chapters',
      prompt: 'Please organize the following text into a logical chapter or section structure. Add appropriate headings (using HTML <h1>, <h2>, <h3> tags) where topics shift, and ensure the content flows logically from one section to the next.'
    },
    {
      id: 'grammar-check',
      name: 'Grammar & Spell Check',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Fix typos, grammar, and punctuation errors',
      prompt: 'Please review the following text for any grammatical errors, typos, or punctuation mistakes. Correct them while preserving the original meaning and style. Return the corrected text in HTML format.'
    },
    {
      id: 'vocabulary-enhancer',
      name: 'Vocabulary Enhancer',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Upgrade word choice and use stronger verbs',
      prompt: 'Please enhance the vocabulary of the following text. Replace weak verbs with stronger ones, and use more precise or evocative language where appropriate, without making it sound overly complex. Return the enhanced text in HTML format.'
    },
    {
      id: 'conciseness',
      name: 'Conciseness Agent',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Remove fluff and make the text punchy',
      prompt: 'Please edit the following text to be more concise. Remove unnecessary words, redundant phrases, and fluff. Make the writing punchy and direct while keeping the core message. Return the concise text in HTML format.'
    },
    {
      id: 'expansion',
      name: 'Expansion Agent',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Elaborate on points and add more detail',
      prompt: 'Please expand on the following text. Add more relevant details, examples, or elaboration to flesh out the ideas presented. Make it richer and more comprehensive. Return the expanded text in HTML format.'
    },
    {
      id: 'dialogue-improver',
      name: 'Dialogue Improver',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      description: 'Make dialogue more natural and engaging',
      prompt: 'Please improve the dialogue in the following text. Make it sound more natural, engaging, and characteristic of the speakers. Ensure the dialogue tags and actions flow well. Return the improved text in HTML format.'
    },
    {
      id: 'show-dont-tell',
      name: 'Show, Don\'t Tell Agent',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Convert descriptive telling into active showing',
      prompt: 'Please rewrite the following text using the "show, don\'t tell" principle. Instead of stating emotions or facts directly, describe actions, sensory details, and reactions that imply them. Return the rewritten text in HTML format.'
    },
    {
      id: 'sensory-details',
      name: 'Sensory Details Agent',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Add sight, sound, smell, touch, and taste',
      prompt: 'Please enrich the following text by adding vivid sensory details. Incorporate descriptions of sight, sound, smell, touch, and taste to make the scene more immersive. Return the enriched text in HTML format.'
    },
    {
      id: 'pacing-adjuster',
      name: 'Pacing Adjuster',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Adjust the narrative flow and pacing',
      prompt: 'Please adjust the pacing of the following text. If it\'s an action scene, use shorter, punchier sentences to speed it up. If it\'s a reflective scene, use longer, flowing sentences to slow it down. Return the adjusted text in HTML format.'
    },
    {
      id: 'summarization',
      name: 'Summarization Agent',
      icon: <AlignLeft className="h-4 w-4 mr-2" />,
      description: 'Summarize the section into key points',
      prompt: 'Please summarize the following text into a concise summary. Return the summary in HTML format.'
    },
    {
      id: 'expansion-detailed',
      name: 'Expansion Agent (Detailed)',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Expand short text into detailed paragraphs',
      prompt: 'Please expand the following short text into a highly detailed and comprehensive section. Add necessary context, examples, and depth. Return the expanded text in HTML format.'
    },
    {
      id: 'simplification',
      name: 'Simplification Agent',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Make complex text easy to read',
      prompt: 'Please simplify the following complex text to make it highly readable and accessible to a general audience. Remove jargon and use clear, simple language. Return the simplified text in HTML format.'
    },
    {
      id: 'style-transfer',
      name: 'Style Transfer Agent',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Rewrite in a specific style (formal, sci-fi, etc.)',
      prompt: 'Please rewrite the following text in a distinct, engaging style (e.g., highly formal, sci-fi, or dramatic, depending on the context). Elevate the prose to match a strong stylistic voice. Return the stylized text in HTML format.'
    },
    {
      id: 'grammar-correction',
      name: 'Grammar Correction Engine',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Advanced grammar and syntax correction',
      prompt: 'Please perform an advanced grammar and syntax correction on the following text. Fix all errors, improve sentence structure, and ensure perfect readability while preserving the original meaning. Return the corrected text in HTML format.'
    },
    {
      id: 'context-rewrite',
      name: 'Context-aware Rewrite Engine',
      icon: <Wand2 className="h-4 w-4 mr-2" />,
      description: 'Rewrite text considering surrounding context',
      prompt: 'Please rewrite the following text to perfectly blend with its surrounding context. Improve the transitions, ensure logical flow, and adapt the tone to fit seamlessly. Return the rewritten text in HTML format.'
    },
    {
      id: 'citation-generator',
      name: 'Citation Generator',
      icon: <BookOpen className="h-4 w-4 mr-2" />,
      description: 'Generate and append citations for claims',
      prompt: 'Please analyze the following text, identify any factual claims that require citations, and append plausible or placeholder academic citations (e.g., [Author, Year]) formatted correctly. Return the updated text with citations in HTML format.'
    },
    {
      id: 'idea-suggestion',
      name: 'Idea Suggestion Engine',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      description: 'Suggest hints for the next paragraph',
      prompt: 'Based on the following text, suggest 3 creative ideas or hints for what should happen in the next paragraph. Format the suggestions as an HTML bulleted list (<ul><li>...</li></ul>).',
      action: 'append'
    },
    {
      id: 'super-polish',
      name: 'Super Polish (Multi-Agent)',
      icon: <Wand2 className="h-4 w-4 mr-2 text-primary" />,
      description: 'Grammar -> Tone -> Auto-format (Sequential)',
      prompt: [
        'Please review the following text for any grammatical errors, typos, or punctuation mistakes. Correct them while preserving the original meaning and style. Return the corrected text in HTML format.',
        'Please rewrite the following text to ensure a consistent, professional, and engaging tone throughout. Smooth out any awkward transitions and make the voice sound unified.',
        'Please format the following text properly. Fix any weird spacing, ensure consistent paragraph breaks, and apply appropriate HTML tags (like <p>, <strong>, <em>) where it makes sense. Do not change the words, just the formatting.'
      ]
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="sm" className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
          <Wand2 className="h-4 w-4" />
          Writing Agents
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>AI Assistants</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[400px]">
            {agents.map(agent => (
              <DropdownMenuItem 
                key={agent.id}
                onClick={() => applyAgent(agent.name, agent.prompt)}
                disabled={loadingAgent !== null}
                className="flex flex-col items-start py-3 cursor-pointer"
              >
                <div className="flex items-center w-full">
                  {loadingAgent === agent.name ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" /> : agent.icon}
                  <span className="font-medium">{agent.name}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1 pl-6 leading-relaxed">{agent.description}</span>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
