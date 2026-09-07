import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

/**
 * Drives the ACTUAL rendered UI (not just the rules engine) through a
 * minimal happy path for a salaried borrower, to catch integration bugs
 * that unit tests of the engine alone cannot see: screen transitions,
 * whether a question actually renders its control, whether clicking an
 * option advances state, and whether the Results screen renders without
 * crashing once real DOM interactions have populated the draft.
 */
describe('End-to-end UI smoke test', () => {
  it('walks a salaried borrower from Landing through to a Borrow verdict on Results', async () => {
    render(<App />);

    // Landing
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // purpose (single_select)
    fireEvent.click(await screen.findByRole('button', { name: 'Wedding' }));

    // amountWanted (currency_number)
    const amountInput = await screen.findByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '800000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // productHint (single_select) — pick "Not sure"
    fireEvent.click(await screen.findByRole('button', { name: /Not sure/i }));

    // incomeType (single_select)
    fireEvent.click(await screen.findByRole('button', { name: /Salaried/i }));

    // netMonthlyIncomeSalaried (currency_number)
    let numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '110000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // existingMonthlyEMI (currency_number, allowUnknown)
    numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '14000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // householdMonthlyExpenses — pick "I don't know" to exercise the unknown path
    await screen.findByRole('spinbutton');
    fireEvent.click(screen.getByRole('button', { name: "I don't know" }));

    // ageYears (number)
    numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // creditScore (credit_score_or_unknown)
    numInput = await screen.findByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '780' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // recentBounce (yes_no_unknown)
    fireEvent.click(await screen.findByRole('button', { name: 'No' }));

    // Skip remaining adaptive questions to jump to results.
    const skipButton = await screen.findByRole('button', { name: /Skip remaining optional questions/i });
    fireEvent.click(skipButton);

    // Results screen should now show the Borrow verdict.
    expect(await screen.findByText('Borrow')).toBeInTheDocument();
    expect(screen.getByText(/Safe for you/i)).toBeInTheDocument();
    expect(screen.getByText(/Lender may offer/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Range:/i)).toHaveLength(2);
    expect(screen.getByText(/Planning range:/i)).toBeInTheDocument();

    // Open the Negotiation Card and confirm it renders from the same result.
    fireEvent.click(screen.getByRole('button', { name: /Open my Negotiation Card/i }));
    expect(await screen.findByText('Negotiation Card')).toBeInTheDocument();
    expect(screen.getByText(/Ask the lender/i)).toBeInTheDocument();
    expect(screen.getByText(/Red flags/i)).toBeInTheDocument();
  });
});
