import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule, registerLocaleData, DatePipe } from '@angular/common';
import localeTh from '@angular/common/locales/th';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

/* ===== Angular Material ===== */
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatRadioModule } from '@angular/material/radio';

/* ===== Components ===== */
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RegisterSuccessComponent } from './features/auth/register-success/register-success.component';
import { DocumentsallComponent } from './features/documentsall/documentsall.component';
import { InvoiceFormComponent } from './features/invoice/invoice-form/invoice-form.component';
import { NewDocumentDialogComponent } from './features/dialogs/new-document-dialog/new-document-dialog.component';
import { CancelDialogComponent } from './features/dialogs/cancel-dialog/cancel-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharedModule } from './shared/shared.module';

/* ===== Interceptors ===== */
import { LoadingInterceptor } from './shared/Loding/loading.interceptor';
import { JwtInterceptor } from './shared/jwt.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';

/* ===== Guards ===== */
import { AuthGuard } from './auth.guard';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { LayoutModule } from './features/layout/layout.module';

registerLocaleData(localeTh);

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterSuccessComponent,
    RegisterComponent,
    DashboardComponent,
    DocumentsallComponent,
    InvoiceFormComponent,
    NewDocumentDialogComponent,
    PlaceholderComponent,
    CancelDialogComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    SharedModule,
    DateInputsModule, // Import SharedModule here
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTableModule,
    MatDialogModule,
    MatSelectModule,
    OverlayModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    LayoutModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
  ],
  providers: [
    AuthGuard,
    DatePipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true,
    },
    { provide: LOCALE_ID, useValue: 'th' },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
