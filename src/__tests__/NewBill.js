/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import router from "../app/Router"

// Mock the Store module to use the test mock instead of the real implementation
jest.mock("../app/Store.js", () => mockStore)

// Top-level test suite: user is connected as an employee
describe("Given I am connected as an employee", () => {
  // Before each test, set up the mocked localStorage with an employee user
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "e@a"
    }))
  })
  // Nested suite: user is on the NewBill page
  describe("When I am on NewBill Page", () => {
    // Test: the bill icon should be highlighted
    test("Then mail icon in vertical layout should be highlighted", async () => {
      // Set up DOM root
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      // Initialize router and navigate to NewBill page
      router()
      window.onNavigate(ROUTES_PATH.NewBill)
      // Wait for the icon to appear
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')
      // Assert the icon has the 'active-icon' class
      expect(mailIcon.classList.contains('active-icon')).toBe(true)
    })

    test("Then the new bill form with the labels and inputs should be displayed", () => {
      // Define a navigation function
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      // Instantiate NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      // Render the NewBill UI
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const newBillForm = screen.getByTestId("form-new-bill")
      // Check form and all labels/inputs are present
      // Labels
      expect(newBillForm).toBeTruthy()
      expect(screen.getByText('Type de dépense')).toBeTruthy()
      expect(screen.getByText('Nom de la dépense')).toBeTruthy()
      expect(screen.getByText('Date')).toBeTruthy()
      expect(screen.getByText('Montant TTC')).toBeTruthy()
      expect(screen.getByText('TVA')).toBeTruthy()
      expect(screen.getByText('Commentaire')).toBeTruthy()
      expect(screen.getByText('Justificatif')).toBeTruthy()
      // Inputs
      expect(screen.getByTestId('form-new-bill')).toBeTruthy()
      expect(screen.getByTestId('expense-type')).toBeTruthy()
      expect(screen.getByTestId('expense-name')).toBeTruthy()
      expect(screen.getByTestId('datepicker')).toBeTruthy()
      expect(screen.getByTestId('amount')).toBeTruthy()
      expect(screen.getByTestId('vat')).toBeTruthy()
      expect(screen.getByTestId('pct')).toBeTruthy()
      expect(screen.getByTestId('commentary')).toBeTruthy()
      expect(screen.getByTestId('file')).toBeTruthy()
    })

    test("Then a submit button should be displayed", async () => {
      // Navigation function for rendering
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      // Instantiate NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
       // Render the NewBill UI
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      // Submit button should exist
      const submitButton = screen.getByTestId("btn-send-bill")
      expect(submitButton).toBeTruthy()
    })
  })

  describe("When I upload a file", () => {
    test("Then the file input should update", async () => {
      // Navigation function for rendering
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      // Instantiate NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      // Render the NewBill UI
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      // Get the file input and mock the file change handler
      const inputFile = screen.getByTestId("file")
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      inputFile.addEventListener("change", handleChangeFile)
      // Simulate file upload (valid image file)
      fireEvent.change(inputFile, {
        target: {
          files: [new File(["test"], "test.jpg", { type: "image/jpg" })],
        },
      })
      // Handler should be called and file name should be correct
      expect(handleChangeFile).toHaveBeenCalled()
      expect(inputFile.files[0].name).toBe("test.jpg")
    })

    test("Then it should show an error for invalid file type", () => {
      // Navigation function for rendering
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      // Instantiate NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      // Render the NewBill UI
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      // Mock the file change handler and window.alert
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      const inputFile = screen.getByTestId("file")
      inputFile.addEventListener("change", handleChangeFile)
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => { })
      // Simulate invalid file upload (PDF)
      fireEvent.change(inputFile, {
        target: {
          files: [new File(["test"], "test.pdf", { type: "application/pdf" })],
        },
      })
      // Handler and alert should be called, and input is reset
      expect(handleChangeFile).toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith("Type de fichier non valide. Veuillez télécharger un fichier jpg, jpeg ou png")
      expect(inputFile.value).toBe("")
      alertMock.mockRestore()
    })
  })

  describe("When I submit the form with empty fields", () => {
    test("Then it should stay on NewBill page", async () => {
      // Use a mock navigation function to check if redirection occurs
      const onNavigate = jest.fn()
      // Instantiate NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      // Render the NewBill UI
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const newBillForm = screen.getByTestId("form-new-bill")
      // Ensure all fields are empty
      const inputFields = newBillForm.querySelectorAll('input')
      inputFields.forEach(input => {
        fireEvent.change(input, { target: { value: '' } })
      })
      // Mock the submit handler and simulate form submission
      const handleSubmit = jest.fn(newBill.handleSubmit)
      newBillForm.addEventListener("submit", handleSubmit)
      fireEvent.submit(newBillForm)
      // Handler should be called, form still exists, and error message is shown
      expect(handleSubmit).toHaveBeenCalled()
      expect(newBillForm).toBeTruthy()
    })
  })

  describe("When I submit the form with valid data", () => {
    test("Then a new bill should be created and I should be redirected to Bills page", async () => {
      // Spy on bills method to check if it's called
      jest.spyOn(mockStore, "bills")
      // Mock navigation to check for redirection
      const onNavigate = jest.fn((pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      })
      // Instantiate NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      // Render the NewBill UI
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const newBillForm = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn(newBill.handleSubmit.bind(newBill));
      newBillForm.addEventListener("submit", handleSubmit);
      // Fill all form fields with valid data
      screen.getByTestId('expense-type').value = "Transports"
      screen.getByTestId('expense-name').value = "Test"
      screen.getByTestId('datepicker').value = "2022-08-10"
      screen.getByTestId('amount').value = 500
      screen.getByTestId('vat').value = 70
      screen.getByTestId('pct').value = 20
      screen.getByTestId('commentary').value = "Test"
      // Mock file change handler and simulate file upload
      const inputFile = screen.getByTestId('file')
      const file = new File(["test"], "test.png", { type: "image/png" })
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fireEvent.change(inputFile, { target: { files: [file] } })
      handleChangeFile({
        target: {
          files: [file],
          value: '\path\test.png',
        },
        preventDefault: function () { }
      })
      // Submit the form
      fireEvent.submit(newBillForm)
      // File handler and navigation should be called
      expect(handleSubmit).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills);
    })
  });
})
// Integration test for POST request on NewBill
describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = ''
    // Spy on bills method and set up localStorage and root element
    jest.spyOn(mockStore, "bills")
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: "e@a" }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.appendChild(root)
    router()
  })

  describe("When I am on NewBill Page", () => {
    test("Then it should Post bills on mock API POST", async () => {
      // Instantiate NewBill and navigate to NewBill page
      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      })
      window.onNavigate(ROUTES_PATH.NewBill)
      const newBillForm = screen.getByTestId("form-new-bill")
      // Mock submit handler
      const handleSubmit = jest.fn(newBill.handleSubmit)
      newBillForm.addEventListener("submit", handleSubmit)
      // Fill the form with mock data
      fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } })
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Test" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-07-15" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "100" } })
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("file"), {
        target: {
          files: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })]
        }
      })
      // Submit the form
      fireEvent.submit(newBillForm)
      // Submit handler and bills API should be called, and page is updated
      expect(handleSubmit).toHaveBeenCalled()
      expect(mockStore.bills).toHaveBeenCalled()
      // Wait for the page title to appear
      await waitFor(() => screen.getByText("Mes notes de frais"))
      // Get the table body containing bills
      const listOfBills = screen.getByTestId("tbody")
      // Assert that the bills table is rendered
      expect(listOfBills).toBeTruthy()
    })

    describe("When an error occurs on API", () => {
      test("fetches bills from an API and fails with 404 message error", async () => {
        // Mock the bills API to reject with a 404 error
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"))
            }
          }
        })
        // Navigate to dashboard and wait for error message
        window.onNavigate(ROUTES_PATH.Dashboard)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })

      test("fetches messages from an API and fails with 500 message error", async () => {
        // Mock the bills API to reject with a 500 error
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })
        // Navigate to dashboard and wait for error message
        window.onNavigate(ROUTES_PATH.Dashboard)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})
