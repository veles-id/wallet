import { CredentialTypePipe } from './credential-type.pipe';

describe('CredentialTypePipe', () => {
  const pipe = new CredentialTypePipe();

  it('removes Credential suffix and splits PascalCase', () => {
    expect(pipe.transform('UniversityDegreeCredential')).toBe('University Degree');
  });

  it('handles AchievementCredential', () => {
    expect(pipe.transform('AchievementCredential')).toBe('Achievement');
  });

  it('handles EmailCredential', () => {
    expect(pipe.transform('EmailCredential')).toBe('Email');
  });

  it('handles VerifiableCredential', () => {
    expect(pipe.transform('VerifiableCredential')).toBe('Verifiable');
  });

  it('handles types without Credential suffix', () => {
    expect(pipe.transform('ProofOfAchievement')).toBe('Proof Of Achievement');
  });

  it('handles single word', () => {
    expect(pipe.transform('Credential')).toBe('');
  });

  it('handles empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('handles consecutive uppercase letters', () => {
    expect(pipe.transform('HTMLEditorCredential')).toBe('HTML Editor');
  });
});
