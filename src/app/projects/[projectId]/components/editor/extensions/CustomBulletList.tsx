import { Extension } from "@tiptap/core";
import { BulletList } from "@tiptap/extension-bullet-list";
import { ListItem } from "@tiptap/extension-list-item";

export const CustomBulletList = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      // Override the default * shortcut to handle cursor positioning better
      '*': ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;
        
        // Check if we're at the start of a line
        if ($from.parentOffset === 0) {
          // If we're in a paragraph, convert to bullet list
          if ($from.parent.type.name === 'paragraph') {
            return editor.chain().focus().toggleBulletList().run();
          }
          // If we're already in a list item, just insert the text
          if ($from.parent.type.name === 'listItem') {
            return false; // Let default behavior handle it
          }
        }
        
        // If we're not at the start of a line, just insert the character
        return false;
      },
      
      // Handle Enter key in lists for better UX
      Enter: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;
        
        // If we're in a list item and it's empty, exit the list
        if ($from.parent.type.name === 'listItem' && $from.parent.textContent === '') {
          return editor.chain().focus().liftListItem('listItem').run();
        }
        
        // Default behavior for Enter
        return false;
      },
      
      // Handle Backspace in lists
      Backspace: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;
        
        // If we're at the start of a list item and it's empty, convert back to paragraph
        if ($from.parent.type.name === 'listItem' && 
            $from.parentOffset === 0 && 
            $from.parent.textContent === '') {
          return editor.chain().focus().liftListItem('listItem').run();
        }
        
        return false;
      }
    };
  },
  
  addCommands() {
    return {
      ...this.parent?.(),
      
      // Override toggleBulletList to ensure proper cursor positioning
      toggleBulletList: () => ({ commands }) => {
        const { state } = this.editor.view;
        const { selection } = state;
        const { $from } = selection;
        
        // If we're in a paragraph, convert to bullet list
        if ($from.parent.type.name === 'paragraph') {
          return commands.wrapInList('bulletList');
        }
        
        // If we're already in a list, toggle it off
        if ($from.parent.type.name === 'listItem') {
          return commands.liftListItem('listItem');
        }
        
        return false;
      }
    };
  }
});

export const CustomListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      // Ensure proper cursor positioning when typing in list items
      'ArrowRight': ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;
        
        // If we're at the end of a list item, allow normal movement
        if ($from.parentOffset === $from.parent.nodeSize - 2) {
          return false;
        }
        
        return false;
      }
    };
  }
});
