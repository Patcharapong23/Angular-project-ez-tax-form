import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

/* ===== Angular Material ===== */
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatSnackBarModule } from '@angular/material/snack-bar';

/* ===== Components ===== */
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { LayoutComponent } from './features/layout/layout.component';
import { TopbarComponent } from './shared/topbar/topbar.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RegisterSuccessComponent } from './features/auth/register-success/register-success.component';
import { DocumentsallComponent } from './features/documentsall/documentsall.component';
import { InvoiceFormComponent } from './features/invoice/invoice-form/invoice-form.component';
import { NewDocumentDialogComponent } from './features/dialogs/new-document-dialog/new-document-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharedModule } from './shared/shared.module';

/* ===== Interceptors ===== */
import { LoadingInterceptor } from './shared/Loding/loading.interceptor';
import { JwtInterceptor } from './shared/jwt.interceptor';

/* ===== Guards ===== */
import { AuthGuard } from './auth.guard';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';
import { ViewDocumentComponent } from './features/documents/view-document/view-document.component';
import { EditDocumentComponent } from './features/documents/edit-document/edit-document.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterSuccessComponent,
    RegisterComponent,
    DashboardComponent,
    SidebarComponent,
    TopbarComponent,
    LayoutComponent,
    DocumentsallComponent,
    InvoiceFormComponent,
    NewDocumentDialogComponent,
    PlaceholderComponent,
    ViewDocumentComponent,
    EditDocumentComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    SharedModule, // Import SharedModule here
  ],
  providers: [
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
