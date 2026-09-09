import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { OtpInput } from './otp-input';

/** Mirrors real usage: the parent owns the value, OtpInput only reports changes. */
const ControlledOtpInput = ({ initialValue = '', length }: { initialValue?: string; length?: number }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <OtpInput value={value} onChange={setValue} length={length} />
      <output data-testid="value">{value}</output>
    </>
  );
};

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const currentValue = () => screen.getByTestId('value').textContent;

describe('OtpInput', () => {
  it('renders 6 boxes by default and honours a custom length', () => {
    const { unmount } = render(<ControlledOtpInput />);
    expect(boxes()).toHaveLength(6);
    unmount();

    render(<ControlledOtpInput length={4} />);
    expect(boxes()).toHaveLength(4);
  });

  it('collects typed digits and auto-advances the focus', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput />);

    await user.type(boxes()[0], '123456');

    expect(currentValue()).toBe('123456');
    expect(boxes()[5]).toHaveFocus();
  });

  it('ignores non-digit characters', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput />);

    await user.type(boxes()[0], 'a');
    expect(currentValue()).toBe('');

    await user.type(boxes()[0], '7');
    expect(currentValue()).toBe('7');
  });

  it('stops accepting input after the last box', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput initialValue="123456" />);

    await user.type(boxes()[5], '9');

    expect(currentValue()).toHaveLength(6);
  });

  it('clears the current digit on Backspace', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput initialValue="12" />);

    boxes()[1].focus();
    await user.keyboard('{Backspace}');

    expect(currentValue()).toBe('1');
  });

  it('deletes the previous digit and moves back when the box is empty', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput initialValue="12" />);

    boxes()[2].focus();
    await user.keyboard('{Backspace}');

    expect(currentValue()).toBe('1');
    expect(boxes()[1]).toHaveFocus();
  });

  it('moves focus with the arrow keys and stops at both edges', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput />);

    boxes()[0].focus();
    await user.keyboard('{ArrowLeft}');
    expect(boxes()[0]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(boxes()[1]).toHaveFocus();

    boxes()[5].focus();
    await user.keyboard('{ArrowRight}');
    expect(boxes()[5]).toHaveFocus();
  });

  it('accepts a pasted code and strips separators', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput />);

    boxes()[0].focus();
    await user.paste('12-34 56');

    expect(currentValue()).toBe('123456');
    expect(boxes()[5]).toHaveFocus();
  });

  it('truncates a pasted code longer than the input length', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput />);

    boxes()[0].focus();
    await user.paste('123456789');

    expect(currentValue()).toBe('123456');
  });

  it('ignores a paste that contains no digits', async () => {
    const user = userEvent.setup();
    render(<ControlledOtpInput initialValue="12" />);

    boxes()[0].focus();
    await user.paste('abc-def');

    expect(currentValue()).toBe('12');
  });

  it('uses one-time-code autocomplete and a numeric keypad', () => {
    render(<ControlledOtpInput />);
    for (const box of boxes()) {
      expect(box).toHaveAttribute('autocomplete', 'one-time-code');
      expect(box).toHaveAttribute('inputmode', 'numeric');
    }
  });
});
