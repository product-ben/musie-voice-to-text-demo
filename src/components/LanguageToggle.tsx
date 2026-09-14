import { LANGUAGE_OPTIONS, type LanguageChoice } from "../config";

type Props = {
  value: LanguageChoice;
  onChange: (value: LanguageChoice) => void;
  disabled: boolean;
};

export function LanguageToggle({ value, onChange, disabled }: Props) {
  return (
    <div className="toggle" role="radiogroup" aria-label="Language">
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "toggle-option is-active" : "toggle-option"}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
