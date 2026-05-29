import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SharedComponent } from "../shared/shared";

@Component({
  selector: 'forms-component',
  imports: [RouterOutlet, SharedComponent],
  templateUrl: './forms.html',
})
export class Forms {

}
