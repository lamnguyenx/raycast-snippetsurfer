import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type { TemplatePrompt } from "../utils/TemplateExpander";

interface TemplateArgumentFormProps {
  prompts: TemplatePrompt[];
  onSubmit: (values: { [id: string]: string }) => void;
}

// Collects values for {{ask:Label}} and {{choice:...}} tokens before a snippet action runs.
export default function TemplateArgumentForm({ prompts, onSubmit }: TemplateArgumentFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Fill In Snippet Values"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Insert Snippet"
            onSubmit={(values: Form.Values) => {
              pop();
              onSubmit(values as { [id: string]: string });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`This snippet needs ${prompts.length === 1 ? "a value" : `${prompts.length} values`}.`} />
      {prompts.map((prompt) =>
        prompt.kind === "choice" ? (
          <Form.Dropdown key={prompt.id} id={prompt.id} title={prompt.label} defaultValue={prompt.defaultValue}>
            {(prompt.options ?? []).map((option) => (
              <Form.Dropdown.Item key={option} value={option} title={option} />
            ))}
          </Form.Dropdown>
        ) : (
          <Form.TextField
            key={prompt.id}
            id={prompt.id}
            title={prompt.label}
            defaultValue={prompt.defaultValue}
            placeholder={`Enter ${prompt.label}`}
          />
        )
      )}
    </Form>
  );
}
