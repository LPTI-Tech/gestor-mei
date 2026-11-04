---
name: lpti-brand-guidelines
description: >-
  Diretrizes oficiais de marca e proteção de identidade visual da LPTI Tech e do Gestor MEI.
  Proíbe expressamente a substituição da marca Gestor MEI e assegura a atribuição
  correta da LPTI Tech como empresa desenvolvedora em toda a interface.
---

# LPTI Tech & Gestor MEI — Official Brand Guidelines

Este documento estabelece as diretrizes invioláveis de identidade corporativa, posicionamento de marca e integridade visual do **GESTOR MEI** e de sua empresa desenvolvedora, a **LPTI Tech**.

---

## 🏛️ 1. Hierarquia e Regra Pétrea de Marca

A relação entre a empresa e o produto obedece a uma separação clara e mandante:

- **A EMPRESA:** `LPTI Tech`
  - Papel: Empresa proprietária da tecnologia, desenvolvedora da plataforma e mantenedora oficial da infraestrutura.
  - Manifestação na Interface: Sempre creditada como a desenvolvedora em rodapés, termos de uso, telas sobre o sistema e documentações técnicas (ex: *"Desenvolvido por LPTI Tech"*).
- **O PRODUTO:** `Gestor MEI`
  - Papel: O software SaaS que o cliente final contrata e utiliza no dia a dia.
  - Manifestação na Interface: A marca principal visível no topo da Sidebar, na tela de Login, na aba do navegador (Title/Favicon) e nos comprovantes emitidos aos clientes.

---

## 🚫 2. Proibições Terminantes de Marca

1. **PROIBIDO Substituir a Marca do Produto:**
   - Sob nenhuma hipótese o nome "Gestor MEI" ou suas logos oficiais podem ser removidos, renomeados para nomes genéricos ("ERP MEI", "Sistema de Gestão", "Meu App") ou substituídos por marcas de terceiros sem homologação contratual de white-label.
2. **PROIBIDO Inverter a Relação Empresa $\leftrightarrow$ Produto:**
   - Nunca intitular o software como "LPTI MEI" ou dizer que "Gestor MEI desenvolveu o software".
3. **PROIBIDO Ocultar a Assinatura da LPTI Tech:**
   - A assinatura *"Desenvolvido por LPTI Tech"* na base da barra lateral (`Sidebar`) e nas telas de autenticação é componente de auditoria e propriedade intelectual obrigatório.

---

## 🎨 3. Especificações Visuais da Marca

### Cores Oficiais
- **Navy Primário (`#071933`):** Cor institucional da LPTI Tech e do Gestor MEI. Fundo da logo, cabeçalhos contrastantes e bordas sólidas de destaque.
- **Tech Blue (`#1976D2`):** Acento do Gestor MEI. Botões de ação, links, ícones de módulo ativos.
- **Electric Blue (`#42A5F5`):** Variação clara de contraste para fundos escuros.

### Tipografia Oficial
- **Família:** `Roboto` / `Inter`, com suporte nativo do Material-UI.
- **Marca Principal (GESTOR MEI):** Sempre em caixa alta com peso `800` (Extra Bold) ou `700` (Bold), espaçamento entre letras de `0.02em` a `-0.01em`.
- **Chancela / Tagline Oficial:** *"ERP Inteligente para MEIs e Pequenos Negócios"* (peso 600, tom `text.secondary`).

---

## 📐 4. Posicionamento Padrão na Interface

### Na Tela de Login
```
1. LOGO OFICIAL (Container escuro #071933, cantos arredondados 16px)
2. GESTOR MEI (Tipografia H5 com peso 800)
3. ERP Inteligente para MEIs e Pequenos Negócios (Subtítulo com peso 600)
4. Badge Sistema Online
5. Formulário de Acesso
```

### Na Barra Lateral (Sidebar / Navigation Drawer)
```
[ Ícone Gestor MEI (44px) ]  GESTOR MEI (H6 peso 800)
                            ERP Inteligente (Caption peso 700)
Nome Fantasia da Empresa MEI (ex: Sabor & Família)
Badge Sistema Online

... (Menu de navegação) ...

[ Rodapé da Sidebar ]: Desenvolvido por LPTI Tech (fontWeight 700)
```

---

## 📑 Guias Complementares
- [Hierarquia e Relação Jurídico-Visual](./references/brand-hierarchy.md)
- [Assets Oficiais e Proporções Mínimas](./references/brand-assets.md)
- [Exemplo de Componente React de Rodapé Oficial](./examples/OfficialBrandFooter.example.tsx)
- [Tokens de Marca em JSON](./resources/brand-tokens.json)
