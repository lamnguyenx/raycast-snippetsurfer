import { Action, ActionPanel, Form, Image, useNavigation } from "@raycast/api";
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
// Every content action (copy, paste, type) is a submit action so the user can pick how to
// use the snippet after filling in the form.
export default function TemplateArgumentForm({ prompts, actions }: TemplateArgumentFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Fill In Snippet Values"
      actions={
        <ActionPanel>
          {actions.map((action) => (
            <Action.SubmitForm
              key={action.title}
              title={action.title}
              icon={action.icon}
              onSubmit={(values: Form.Values) => {
                const result = action.onSubmit(values as { [id: string]: string });
                pop();
                return result;
              }}
            />
          ))}
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
