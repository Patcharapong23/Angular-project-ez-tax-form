import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material Modules
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatRadioModule } from '@angular/material/radio';

// Directives
import { NumberInputFormatterDirective } from './directives/number-input-formatter.directive';
import { PhoneFormatDirective } from './directives/phone-format.directive';
import { HasPermissionDirective } from './directives/has-permission.directive';
import { ThaiDatePipe } from './pipes/thai-date.pipe';
import { PhonePipe } from './pipes/phone.pipe';

// Dialogs
import { SuccessDialogComponent } from './dialogs/success-dialog/success-dialog.component';
import { ConfirmDialogComponent } from './dialogs/confirm-dialog/confirm-dialog.component';
import { ErrorDialogComponent } from './dialogs/error-dialog/error-dialog.component';

@NgModule({
  declarations: [
    NumberInputFormatterDirective,
    PhoneFormatDirective,
    HasPermissionDirective,
    ThaiDatePipe,
    PhonePipe,
    SuccessDialogComponent,
    ConfirmDialogComponent,
    ErrorDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatOptionModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTableModule,
    OverlayModule,
    MatRadioModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatOptionModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    OverlayModule,
    MatRadioModule,
    NumberInputFormatterDirective,
    PhoneFormatDirective,
    HasPermissionDirective,
    ThaiDatePipe,
    PhonePipe
  ],
  providers: [DatePipe]
})
export class SharedModule { }

