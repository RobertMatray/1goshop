import { StyleSheet } from 'react-native-unistyles'

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicator: {
    fontSize: theme.typography.fontSizeS,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.6)',
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
    overflow: 'visible',
  },
  animationArea: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'visible',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: theme.typography.fontSizeM,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: theme.colors.tint,
    width: 24,
  },
  progressDotDone: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.sizes.radiusSm,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: theme.typography.fontSizeM,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  navButtonPrimary: {
    backgroundColor: theme.colors.tint,
  },
  navButtonPrimaryText: {
    fontSize: theme.typography.fontSizeM,
    color: '#ffffff',
    fontWeight: 'bold',
  },
}))
