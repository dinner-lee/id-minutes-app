import { BulletList } from "@tiptap/extension-bullet-list";
import { ListItem } from "@tiptap/extension-list-item";

export const CustomBulletList = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      // Handle Tab to indent list items
      Tab: ({ editor }) => {
        return editor.chain().sinkListItem('listItem').run();
      },
      
      // Handle Shift+Tab to outdent list items
      'Shift-Tab': ({ editor }) => {
        return editor.chain().liftListItem('listItem').run();
      },
    };
  }
});

export const CustomListItem = ListItem.extend({});
