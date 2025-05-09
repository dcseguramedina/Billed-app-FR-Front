/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import router from "../app/Router"

jest.mock("../app/Store.js", () => mockStore)

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "e@a"
    }))
  });
  describe("When I am on NewBill Page", () => {
    test("Then mail icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')
      expect(mailIcon.classList.contains('active-icon')).toBe(true)

    })
    test("Then the new bill form with the labels and inputs should be displayed", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const newBillForm = screen.getByTestId("form-new-bill")
      // Form
      expect(newBillForm).toBeTruthy()
      //Labels
      expect(screen.getByText('Type de dépense')).toBeTruthy()
      expect(screen.getByText('Nom de la dépense')).toBeTruthy()
      expect(screen.getByText('Date')).toBeTruthy()
      expect(screen.getByText('Montant TTC')).toBeTruthy()
      expect(screen.getByText('TVA')).toBeTruthy()
      expect(screen.getByText('Commentaire')).toBeTruthy()
      expect(screen.getByText('Justificatif')).toBeTruthy()
      //Inputs
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
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const submitButton = screen.getByTestId("btn-send-bill")
      expect(submitButton).toBeTruthy()
    })
  })

  describe("When I upload a file", () => {
    test("Then the file input should update", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const inputFile = screen.getByTestId("file")
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      inputFile.addEventListener("change", handleChangeFile)
      fireEvent.change(inputFile, {
        target: {
          files: [new File(["test"], "test.jpg", { type: "image/jpg" })],
        },
      })

      expect(handleChangeFile).toHaveBeenCalled()
      expect(inputFile.files[0].name).toBe("test.jpg")
    })
    test("Then it should show an error for invalid file type", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      const inputFile = screen.getByTestId("file")
      inputFile.addEventListener("change", handleChangeFile)
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => { })
      fireEvent.change(inputFile, {
        target: {
          files: [new File(["test"], "test.pdf", { type: "application/pdf" })],
        },
      })

      expect(handleChangeFile).toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith("Type de fichier non valide. Veuillez télécharger un fichier jpg, jpeg ou png")
      expect(inputFile.value).toBe("")
      alertMock.mockRestore()
    })
  })

  describe("When I submit the form with empty fields", () => {
    test("Then it should stay on NewBill page and show error messages", async () => {
      const onNavigate = jest.fn()
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const newBillForm = screen.getByTestId("form-new-bill")

      // Ensure fields are empty
      const inputFields = newBillForm.querySelectorAll('input')
      inputFields.forEach(input => {
        fireEvent.change(input, { target: { value: '' } })
      })

      const handleSubmit = jest.fn(newBill.handleSubmit)
      newBillForm.addEventListener("submit", handleSubmit)
      fireEvent.submit(newBillForm)

      expect(handleSubmit).toHaveBeenCalled()
      expect(newBillForm).toBeTruthy()
      // Check for error message
      expect(screen.getByText()).toBeTruthy()
    })
  })

  describe("When I submit the form with valid data", () => {
    test("Then a new bill should be created and I should be redirected to Bills page", async () => {
      jest.spyOn(mockStore, "bills")
      const onNavigate = jest.fn((pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      })
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = NewBillUI({ data: { newBill } })
      const inputFile = screen.getByTestId('file')
      const file = new File(["test"], "test.png", { type: "image/png" })
      screen.getByTestId('expense-type').value = "Transports"
      screen.getByTestId('expense-name').value = "Test"
      screen.getByTestId('datepicker').value = "2022-08-10"
      screen.getByTestId('amount').value = 500
      screen.getByTestId('vat').value = 70
      screen.getByTestId('pct').value = 20
      screen.getByTestId('commentary').value = "Test"

      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fireEvent.change(inputFile, { target: { files: [file] } })
      handleChangeFile({
        target: {
          files: [file],
          value: 'C:\fakepath\test.png',
        },
        preventDefault: function () { }
      })
      const newBillForm = screen.getByTestId("form-new-bill")
      fireEvent.submit(newBillForm)

      expect(handleChangeFile).toHaveBeenCalled()
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills)
    })
  });
})
