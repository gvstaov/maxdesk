# Maxdesk

Uma extensão profissional para monitoramento de tickets do Zendesk com notificações em tempo real.

## 🚀 Recursos

- **Monitoramento em tempo real** de tickets por status (Novo, Aberto, Pendente, Em espera)
- **Sistema de notificações** visuais e sonoras
- **Interface intuitiva** com tema claro/escuro e fácil configuração
- **Monitoramento seletivo** de views específicas
- **Badge no ícone** mostrando tickets críticos
- **Configurações personalizáveis** (intervalo, volume, etc.)
- **Armazenamento local** de configurações

## 📦 Instalação

### Método 1: Instalação (Desenvolvimento)

1. **Baixe os arquivos** da extensão e coloque em uma pasta
2. **Abra o Chrome** e vá para `chrome://extensions/`
3. **Ative o "Modo do desenvolvedor"**
4. **Clique em "Carregar sem compactação"**
5. **Selecione a pasta** onde você salvou os arquivos da extensão
6. A extensão será instalada e aparecerá na barra de ferramentas

### Estrutura de Arquivos Necessária

```
zendesk-monitor/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── README.md
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

**Sugestão de design:**

- Ícone de sino (bell) em estilo flat
- Cores: azul (#2563eb) para o tema claro
- Fundo transparente ou branco

## 🛠Como Usar

1. **Abra uma página do Zendesk**
2. **Clique no ícone** da extensão na barra de ferramentas
3. **Configure suas preferências**:
   - Intervalo de monitoramento (1-60 segundos)
   - Volume das notificações
   - Tema (claro/escuro)
   - Views para monitorar

### Funcionalidades Principais

#### Badge do Ícone

- Mostra o número de tickets **críticos** (Novos + Abertos)
- Cor vermelha quando há tickets
- Desaparece quando todos os tickets são resolvidos

#### Notificações

- **Notificação do navegador** para novos tickets
- **Som de alerta** configurável
- **Histórico** de atividades no popup

#### Configurações

- **Pausar/Retomar** monitoramento
- **Silenciar/Ativar** notificações
- **Intervalo personalizado** (1-60 segundos)
- **Volume** do som (0-100%)
- **Tema** claro ou escuro

#### Monitoramento de Views

- Selecione **views específicas** para monitorar
- Visualize **contadores individuais**
- **Notificações separadas** por view

## Configuração Avançada

### Permissões Necessárias

A extensão solicita as seguintes permissões:

- **`storage`**: Salvar configurações localmente
- **`notifications`**: Exibir notificações do navegador
- **`activeTab`**: Acessar a aba atual do Zendesk
- **`scripting`**: Injetar scripts nas páginas do Zendesk
- **`host_permissions`**: Acessar domínios \*.zendesk.com

### Armazenamento Local

As configurações são salvas usando `chrome.storage.local`:

```javascript
{
  interval: 5,              // segundos
  volume: 0.7,              // 0.0 - 1.0
  darkTheme: false,         // boolean
  isPaused: false,          // boolean
  isMuted: false,           // boolean
  enableViewMonitoring: true, // boolean
  selectedViews: {}         // objeto com views selecionadas
}
```

## Resolução de Problemas

### A extensão não aparece

- Verifique se você está em uma página \*.zendesk.com
- Recarregue a página do Zendesk
- Verifique o console para erros (F12)

### Notificações não funcionam

- Permita notificações quando solicitado
- Verifique as configurações de notificação do Chrome
- Teste o volume das notificações

### Badge não atualiza

- Verifique se o monitoramento não está pausado
- Recarregue a extensão em chrome://extensions/
- Verifique se há erros no console

### Views não aparecem

- Aguarde alguns segundos após carregar a página
- Clique em "Configurar Views" para forçar uma atualização
- Verifique se você tem permissão para ver as views no Zendesk

## Logs de Debug

Para debug, abra o console da extensão:

1. Vá para `chrome://extensions/`
2. Clique em "Detalhes" na extensão
3. Clique em "Inspecionar visualizações: service worker"
4. Ou clique em "Inspecionar visualizações: popup.html"

## Atualizações

Para atualizar a extensão:

1. Substitua os arquivos na pasta da extensão
2. Vá para `chrome://extensions/`
3. Clique no ícone de "Atualizar" na extensão

## Limitações Conhecidas

- Funciona apenas em páginas do Zendesk (.zendesk.com)
- Depende da estrutura HTML atual do Zendesk
- Notificações sonoras podem não funcionar em todas as situações
- Requer permissões de notificação do navegador

## 📄 Licença

Esta extensão é fornecida para uso livre. Modifique conforme necessário.

---

**Versão:** BETA  
**Compatibilidade:** Chrome 88+ (Manifest V3)  
**Última atualização:** AGO/2025

