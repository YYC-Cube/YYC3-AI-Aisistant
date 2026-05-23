import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'server', 'coverage', '*.m_d.tsx'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'buttonVariants',
            'badgeVariants',
            'toggleVariants',
            'navigationMenuTriggerStyle',
            'useSidebar',
            'SidebarProvider',
            'SidebarContent',
            'SidebarFooter',
            'SidebarGroup',
            'SidebarGroupContent',
            'SidebarGroupLabel',
            'SidebarHeader',
            'SidebarInput',
            'SidebarInset',
            'SidebarMenu',
            'SidebarMenuAction',
            'SidebarMenuBadge',
            'SidebarMenuItem',
            'SidebarMenuSkeleton',
            'SidebarMenuSub',
            'SidebarMenuSubButton',
            'SidebarMenuSubItem',
            'SidebarProvider',
            'SidebarRail',
            'SidebarSeparator',
            'SidebarTrigger',
            'formVariants',
            'ASCII_ART_PRESETS',
            'getAsciiArt',
            'ASCII_CODE',
            'ASCII_AI',
            'ASCII_FAMILY',
            'useFormField',
            'Form',
            'FormItem',
            'FormLabel',
            'FormControl',
            'FormDescription',
            'FormMessage',
            'FormField',
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
);
