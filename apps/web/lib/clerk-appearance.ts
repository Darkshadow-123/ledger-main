export const clerkAppearance = {
  variables: {
    colorBackground:              '#111111',
    colorInputBackground:         '#1a1a1a',
    colorInputText:               '#ffffff',
    colorText:                    '#ffffff',
    colorTextSecondary:           '#a1a1aa',
    colorNeutral:                 '#ffffff',
    colorPrimary:                 '#6366f1',
    colorDanger:                  '#ef4444',
    colorTextOnPrimaryBackground: '#ffffff',
    borderRadius:                 '8px',
    fontSize:                     '14px',
  },
  elements: {
    card: {
      backgroundColor: '#111111',
      border:          '1px solid rgba(255,255,255,0.08)',
    },
    headerTitle:    { color: '#ffffff', fontWeight: '600' },
    headerSubtitle: { color: '#a1a1aa' },
    formFieldLabel: { color: '#a1a1aa' },
    formFieldInput: {
      backgroundColor: '#1a1a1a',
      color:           '#ffffff',
      borderColor:     'rgba(255,255,255,0.08)',
    },
    dividerText: { color: '#52525b' },
    dividerLine: { backgroundColor: 'rgba(255,255,255,0.06)' },
    footerActionText: { color: '#a1a1aa' },
    footerActionLink: { color: '#6366f1' },
    footerPages:      { backgroundColor: '#0d0d0d' },
    socialButtonsBlockButton: {
      backgroundColor: '#1a1a1a',
      border:          '1px solid rgba(255,255,255,0.08)',
    },
    socialButtonsBlockButtonText: { color: '#ffffff' },

    userButtonPopoverCard: {
      backgroundColor: '#111111',
      border:          '1px solid rgba(255,255,255,0.08)',
    },
    userButtonPopoverText:          { color: '#ffffff' },
    userButtonPopoverSecondaryText: { color: '#a1a1aa' },
    userButtonPopoverActionButton:  { color: '#ffffff' },
    userButtonPopoverActionButtonText: { color: '#ffffff' },
    userButtonPopoverActionButtonIcon: { color: '#a1a1aa' },
    userButtonPopoverFooter:        { display: 'none' },
    userPreviewMainIdentifier:      { color: '#ffffff' },
    userPreviewSecondaryIdentifier: { color: '#a1a1aa' },
  }
}