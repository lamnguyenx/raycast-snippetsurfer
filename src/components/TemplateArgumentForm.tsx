import { Action, ActionPanel, Form, Image, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { TemplatePrompt } from "../utils/TemplateExpander";

export interface TemplateFormAction {
  title: string;
  icon?: Image.ImageLike;
  onSubmit: (values: { [id: string]: string }) => void | Promise<void>;
}

interface TemplateArgumentFormProps {
  prompts: TemplatePrompt[];
  actions: TemplateFormAction[];
}

// Collects values for {{ask:Label}} and {{choice:...}} tokens before a snippet action runs.
export default function TemplateArgumentForm({ prompts, actions }: TemplateArgumentFormProps) {
  const { pop } = useNavigation();
  const [primaryAction, ...secondaryActions] = actions;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(prompts.map(({ id, defaultValue }) => [id, defaultValue]))
  );

  const updateValue = (id: string, value: string) => {
    setValues((previousValues) => ({ ...previousValues, [id]: value }));
  };

  // Raycast field IDs must be separate from token keys, which can contain punctuation.
  const fields = prompts.map((prompt, index) => ({ ...prompt, fieldId: `prompt-${index}` }));

  const runAction = (action: TemplateFormAction, submittedValues: Record<string, string>) => {
    const result = action.onSubmit(submittedValues);
    pop();
    return result;
  };

  const submitPrimary = (submittedValues: Record<string, string>) =>
    runAction(
      primaryAction,
      Object.fromEntries(fields.map(({ id, fieldId }) => [id, submittedValues[fieldId] ?? values[id]]))
    );

  return (
    <Form
      navigationTitle="Fill In Snippet Values"
      actions={
        <ActionPanel>
          <Action.SubmitForm title={primaryAction.title} icon={primaryAction.icon} onSubmit={submitPrimary} />
          {secondaryActions.map((action) => (
            <Action
              key={action.title}
              title={action.title}
              icon={action.icon}
              onAction={() => runAction(action, values)}
            />
          ))}
        </ActionPanel>
      }
    >
      <Form.Description text={`This snippet needs ${prompts.length === 1 ? "a value" : `${prompts.length} values`}.`} />
      {fields.map((prompt) =>
        prompt.kind === "choice" ? (
          <Form.Dropdown
            key={prompt.fieldId}
            id={prompt.fieldId}
            title={prompt.label}
            value={values[prompt.id]}
            onChange={(value) => updateValue(prompt.id, value)}
          >
            {(prompt.options ?? []).map((option) => (
              <Form.Dropdown.Item key={option} value={option} title={option} />
            ))}
          </Form.Dropdown>
        ) : (
          <Form.TextField
            key={prompt.fieldId}
            id={prompt.fieldId}
            title={prompt.label}
            value={values[prompt.id]}
            onChange={(value) => updateValue(prompt.id, value)}
            placeholder={`Enter ${prompt.label}`}
          />
        )
      )}
    </Form>
  );
}
